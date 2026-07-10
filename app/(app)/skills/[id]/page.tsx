import { redirect, notFound } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { computeSkillWeeklyHours } from "@/lib/skills"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SkillProgressBar } from "@/components/skills/SkillProgressBar"
import { SkillWeeklyChart } from "@/components/skills/SkillWeeklyChart"

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const appUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  const skill = await prisma.skill.findUnique({ where: { id } })

  if (!skill || skill.userId !== user.id) {
    notFound()
  }

  const [totalAgg, sessionCount, weeklyHours, sessions] = await Promise.all([
    prisma.session.aggregate({
      where: { userId: user.id, skillId: id, completed: true },
      _sum: { actualMinutes: true },
    }),
    prisma.session.count({ where: { userId: user.id, skillId: id, completed: true } }),
    computeSkillWeeklyHours(user.id, id, appUser.timezone, 8),
    prisma.session.findMany({
      where: { userId: user.id, skillId: id },
      orderBy: { startedAt: "desc" },
    }),
  ])

  const minutesLogged = totalAgg._sum.actualMinutes ?? 0

  const sessionDateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: appUser.timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <div className="flex-1 bg-background px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <Link
            href="/skills"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Back to skills
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            {skill.name}
          </h1>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <SkillProgressBar
                minutesLogged={minutesLogged}
                targetHours={skill.targetHours}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{sessionCount}</span>{" "}
              {sessionCount === 1 ? "session" : "sessions"} completed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hours per week</CardTitle>
            <CardDescription>Last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <SkillWeeklyChart data={weeklyHours} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sessions tagged to this skill yet.{" "}
                <Link href="/session" className="underline underline-offset-4">
                  Start one
                </Link>
                .
              </p>
            ) : (
              <>
                {/* Table on sm+ screens — a stacked card list reads better
                    on narrow screens than a cramped 4-column table. */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Date</th>
                        <th className="pb-2 pr-4 font-medium">Duration</th>
                        <th className="pb-2 pr-4 font-medium">Distractions</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sessions.map((session) => (
                        <tr key={session.id}>
                          <td className="py-2 pr-4 text-foreground">
                            {session.endedAt
                              ? sessionDateFormatter.format(session.endedAt)
                              : sessionDateFormatter.format(session.startedAt)}
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
                </div>

                <div className="flex flex-col gap-2 sm:hidden">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {session.endedAt
                            ? sessionDateFormatter.format(session.endedAt)
                            : sessionDateFormatter.format(session.startedAt)}
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
                        {session.actualMinutes ?? 0} min · {session.distractions}{" "}
                        {session.distractions === 1 ? "distraction" : "distractions"}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Button asChild variant="outline" className="self-start">
          <Link href="/session">Start a focus session</Link>
        </Button>
      </div>
    </div>
  )
}
