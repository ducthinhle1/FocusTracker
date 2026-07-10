import { redirect } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { computeWeeklyTotals } from "@/lib/dashboard"
import { signOut } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StreakCounter } from "@/components/dashboard/StreakCounter"
import { WeeklyChart } from "@/components/dashboard/WeeklyChart"
import { StreakHistoryChart } from "@/components/dashboard/StreakHistoryChart"
import { WeeklyInsightCard } from "@/components/dashboard/WeeklyInsightCard"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const appUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })

  const [totalMinutesAgg, weeklyTotals, recentAchievements, recentSessions] =
    await Promise.all([
      prisma.session.aggregate({
        where: { userId: user.id, completed: true },
        _sum: { actualMinutes: true },
      }),
      computeWeeklyTotals(user.id, appUser.timezone),
      prisma.userAchievement.findMany({
        where: { userId: user.id },
        orderBy: { unlockedAt: "desc" },
        take: 5,
        include: { achievement: true },
      }),
      prisma.session.findMany({
        where: { userId: user.id, completed: true },
        orderBy: { endedAt: "desc" },
        take: 5,
        include: { skill: { select: { name: true } } },
      }),
    ])

  const totalFocusedHours = (
    (totalMinutesAgg._sum.actualMinutes ?? 0) / 60
  ).toFixed(1)

  const sessionDateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: appUser.timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <div className="flex-1 bg-background px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Logged in as <span className="font-medium">{user.email}</span>
            </p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <StreakCounter
              currentStreak={appUser.currentStreak}
              longestStreak={appUser.longestStreak}
            />
          </div>
          <Card className="flex flex-col justify-center">
            <CardContent className="flex flex-col items-center gap-1 text-center">
              <span className="text-4xl font-semibold text-foreground">
                {totalFocusedHours}
              </span>
              <p className="text-sm text-muted-foreground">Total focused hours</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>This week</CardTitle>
              <CardDescription>Focused minutes per day</CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyChart data={weeklyTotals} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Streak history</CardTitle>
              <CardDescription>Last 60 days</CardDescription>
            </CardHeader>
            <CardContent>
              <StreakHistoryChart />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent achievements</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAchievements.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No achievements yet — complete your first session to start
                  unlocking them.
                </p>
                <Button asChild size="sm">
                  <Link href="/session">Start a focus session</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {recentAchievements.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2"
                  >
                    <span className="text-2xl">{entry.achievement.icon}</span>
                    <span className="text-sm font-medium text-foreground">
                      {entry.achievement.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No completed sessions yet — your first one will show up here.
                </p>
                <Button asChild size="sm">
                  <Link href="/session">Start your first session</Link>
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recentSessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm first:pt-0 last:pb-0"
                  >
                    <span className="text-foreground">
                      {session.endedAt
                        ? sessionDateFormatter.format(session.endedAt)
                        : "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {session.skill?.name ?? "General"}
                    </span>
                    <span className="text-muted-foreground">
                      {session.actualMinutes ?? 0} min
                    </span>
                    <span className="text-muted-foreground">
                      {session.distractions}{" "}
                      {session.distractions === 1 ? "distraction" : "distractions"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <WeeklyInsightCard />

        <Button asChild variant="ghost" className="self-start">
          <Link href="/achievements">View all achievements</Link>
        </Button>
      </div>
    </div>
  )
}
