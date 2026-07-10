import { redirect } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { HistoryFilters } from "@/components/history/HistoryFilters"

const PAGE_SIZE = 20

interface HistorySearchParams {
  skill?: string
  status?: string
  sort?: string
  page?: string
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<HistorySearchParams>
}) {
  const params = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const appUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })

  const skillParam = params.skill ?? "all"
  const statusParam = params.status ?? "all"
  const sortParam: "asc" | "desc" = params.sort === "asc" ? "asc" : "desc"
  const requestedPage = Math.max(1, Number(params.page) || 1)

  // History only shows sessions that have actually ended — the one
  // still-active session (if any) belongs on /session, not here.
  const where: Prisma.SessionWhereInput = {
    userId: user.id,
    endedAt: { not: null },
  }
  if (skillParam === "general") where.skillId = null
  else if (skillParam !== "all") where.skillId = skillParam

  if (statusParam === "completed") where.completed = true
  else if (statusParam === "stopped") where.completed = false

  const [totalCount, skills] = await Promise.all([
    prisma.session.count({ where }),
    prisma.skill.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)

  const sessions = await prisma.session.findMany({
    where,
    orderBy: { startedAt: sortParam },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { skill: { select: { name: true } } },
  })

  const sessionDateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: appUser.timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  function buildHref(overrides: {
    skill?: string
    status?: string
    sort?: "asc" | "desc"
    page?: number
  }) {
    const next = {
      skill: overrides.skill ?? skillParam,
      status: overrides.status ?? statusParam,
      sort: overrides.sort ?? sortParam,
      page: overrides.page ?? currentPage,
    }
    const qs = new URLSearchParams()
    if (next.skill !== "all") qs.set("skill", next.skill)
    if (next.status !== "all") qs.set("status", next.status)
    if (next.sort !== "desc") qs.set("sort", next.sort)
    if (next.page !== 1) qs.set("page", String(next.page))
    const s = qs.toString()
    return s ? `/history?${s}` : "/history"
  }

  const noFiltersApplied = skillParam === "all" && statusParam === "all"

  return (
    <div className="flex-1 bg-background px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">History</h1>
          <p className="text-sm text-muted-foreground">
            All of your focus sessions.
          </p>
        </div>

        <HistoryFilters skills={skills} />

        {totalCount === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {noFiltersApplied
                  ? "You haven't completed any sessions yet."
                  : "No sessions match these filters."}
              </p>
              {noFiltersApplied ? (
                <Button asChild>
                  <Link href="/session">Start your first session</Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/history">Clear filters</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Table on sm+ screens — a 6-column table is too cramped below
                that, so narrow screens get a stacked card list instead. */}
            <Card className="hidden sm:block">
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">
                        <Link
                          href={buildHref({
                            sort: sortParam === "desc" ? "asc" : "desc",
                            page: 1,
                          })}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          Date {sortParam === "desc" ? "↓" : "↑"}
                        </Link>
                      </th>
                      <th className="pb-2 pr-4 font-medium">Skill</th>
                      <th className="pb-2 pr-4 font-medium">Planned</th>
                      <th className="pb-2 pr-4 font-medium">Actual</th>
                      <th className="pb-2 pr-4 font-medium">Distractions</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td className="py-2 pr-4 whitespace-nowrap text-foreground">
                          {sessionDateFormatter.format(session.startedAt)}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {session.skill?.name ?? "General"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {session.plannedMinutes} min
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {session.actualMinutes ?? 0} min
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {session.distractions}
                        </td>
                        <td className="py-2">
                          <span
                            className={
                              session.completed
                                ? "rounded-full bg-[#0ca30c]/10 px-2 py-0.5 text-xs text-[#0ca30c]"
                                : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            }
                          >
                            {session.completed ? "Completed" : "Stopped early"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2 sm:hidden">
              <Link
                href={buildHref({
                  sort: sortParam === "desc" ? "asc" : "desc",
                  page: 1,
                })}
                className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
              >
                Sorted by date {sortParam === "desc" ? "↓" : "↑"}
              </Link>
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="flex flex-col gap-1.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {sessionDateFormatter.format(session.startedAt)}
                      </span>
                      <span
                        className={
                          session.completed
                            ? "rounded-full bg-[#0ca30c]/10 px-2 py-0.5 text-xs text-[#0ca30c]"
                            : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        }
                      >
                        {session.completed ? "Completed" : "Stopped early"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.skill?.name ?? "General"} ·{" "}
                      {session.actualMinutes ?? 0}/{session.plannedMinutes} min ·{" "}
                      {session.distractions}{" "}
                      {session.distractions === 1 ? "distraction" : "distractions"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex gap-2">
                {currentPage > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={buildHref({ page: currentPage - 1 })}>Previous</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                )}
                {currentPage < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={buildHref({ page: currentPage + 1 })}>Next</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
