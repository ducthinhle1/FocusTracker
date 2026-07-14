import { redirect } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { HistoryFilters } from "@/components/history/HistoryFilters"
import { LocalDateTime } from "@/components/LocalDateTime"

const PAGE_SIZE = 20

// Rendered client-side in the browser's own local timezone (see
// LocalDateTime) — never a timezone stored on the server.
const SESSION_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
}

const STATUS_PILL_COMPLETED =
  "rounded-full bg-[#17B26A]/[0.08] px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap text-[#17B26A]"
const STATUS_PILL_STOPPED =
  "rounded-full bg-[#241A14]/[0.06] px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap text-[#8A7B6C]"

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
    <div className="flex-1 bg-[#FBF5EC] px-5 py-7 font-[family-name:var(--font-manrope)] text-[#241A14]">
      <div className="mx-auto flex max-w-[900px] flex-col gap-4">
        <div>
          <h1 className="m-0 font-[family-name:var(--font-sora)] text-[26px] font-extrabold">
            History
          </h1>
          <p className="m-0 text-sm text-[#8A7B6C]">All of your focus sessions.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <HistoryFilters skills={skills} />
          <Link
            href={buildHref({
              sort: sortParam === "desc" ? "asc" : "desc",
              page: 1,
            })}
            className="rounded-[10px] border border-[#241A14]/12 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#241A14]"
          >
            Date {sortParam === "desc" ? "↓" : "↑"}
          </Link>
        </div>

        {totalCount === 0 ? (
          <div className="flex flex-col items-center gap-3.5 rounded-[20px] border border-[#241A14]/[0.06] bg-white px-5 py-10 text-center">
            <p className="m-0 text-sm text-[#8A7B6C]">
              {noFiltersApplied
                ? "You haven't completed any sessions yet."
                : "No sessions match these filters."}
            </p>
            {noFiltersApplied ? (
              <Link
                href="/session"
                className="inline-block rounded-full bg-[linear-gradient(135deg,#FF9142,#EF2D46)] px-5.5 py-3 text-[13.5px] font-extrabold text-white"
              >
                Start a focus session
              </Link>
            ) : (
              <Link
                href="/history"
                className="inline-block rounded-full border border-[#241A14]/12 bg-white px-5.5 py-3 text-[13.5px] font-extrabold text-[#241A14]"
              >
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Table on sm+ screens — a 6-column table is too cramped below
                that, so narrow screens get a stacked card list instead. */}
            <div className="hidden overflow-x-auto rounded-[20px] border border-[#241A14]/[0.06] bg-white sm:block">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="border-b border-[#241A14]/8 text-left">
                    <th className="px-4 py-3 text-[11.5px] font-bold tracking-[0.04em] text-[#8A7B6C] uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-[11.5px] font-bold tracking-[0.04em] text-[#8A7B6C] uppercase">
                      Skill
                    </th>
                    <th className="px-4 py-3 text-[11.5px] font-bold tracking-[0.04em] text-[#8A7B6C] uppercase">
                      Planned
                    </th>
                    <th className="px-4 py-3 text-[11.5px] font-bold tracking-[0.04em] text-[#8A7B6C] uppercase">
                      Actual
                    </th>
                    <th className="px-4 py-3 text-[11.5px] font-bold tracking-[0.04em] text-[#8A7B6C] uppercase">
                      Distractions
                    </th>
                    <th className="px-4 py-3 text-[11.5px] font-bold tracking-[0.04em] text-[#8A7B6C] uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#241A14]/5">
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td className="px-4 py-2.5 whitespace-nowrap font-semibold text-[#241A14]">
                        <LocalDateTime
                          iso={session.startedAt.toISOString()}
                          options={SESSION_DATE_FORMAT}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-[#6B5E4F]">
                        {session.skill?.name ?? "General"}
                      </td>
                      <td className="px-4 py-2.5 text-[#6B5E4F]">
                        {session.plannedMinutes} min
                      </td>
                      <td className="px-4 py-2.5 text-[#6B5E4F]">
                        {session.actualMinutes ?? 0} min
                      </td>
                      <td className="px-4 py-2.5 text-[#6B5E4F]">
                        {session.distractions}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={
                            session.completed
                              ? STATUS_PILL_COMPLETED
                              : STATUS_PILL_STOPPED
                          }
                        >
                          {session.completed ? "Completed" : "Stopped early"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2.5 sm:hidden">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-[#241A14]/[0.06] bg-white px-4 py-3.5"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-bold text-[#241A14]">
                      <LocalDateTime
                        iso={session.startedAt.toISOString()}
                        options={SESSION_DATE_FORMAT}
                      />
                    </span>
                    <span
                      className={
                        session.completed ? STATUS_PILL_COMPLETED : STATUS_PILL_STOPPED
                      }
                    >
                      {session.completed ? "Completed" : "Stopped early"}
                    </span>
                  </div>
                  <p className="m-0 text-[12.5px] text-[#8A7B6C]">
                    {session.skill?.name ?? "General"} · {session.actualMinutes ?? 0}{" "}
                    min / {session.plannedMinutes} min · {session.distractions}{" "}
                    {session.distractions === 1 ? "distraction" : "distractions"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="m-0 text-[13px] text-[#8A7B6C]">
                Page {currentPage} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildHref({ page: currentPage - 1 })}
                    className="rounded-lg border border-[#241A14]/12 bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#241A14]"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-lg border border-[#241A14]/12 bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#241A14]/40">
                    Previous
                  </span>
                )}
                {currentPage < totalPages ? (
                  <Link
                    href={buildHref({ page: currentPage + 1 })}
                    className="rounded-lg border border-[#241A14]/12 bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#241A14]"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-lg border border-[#241A14]/12 bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#241A14]/40">
                    Next
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
