import { redirect } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { computeWeeklyTotals } from "@/lib/dashboard"
import { signOut } from "@/app/login/actions"
import { StreakCounter } from "@/components/dashboard/StreakCounter"
import { WeeklyChart } from "@/components/dashboard/WeeklyChart"
import { StreakHistoryChart } from "@/components/dashboard/StreakHistoryChart"
import { WeeklyInsightCard } from "@/components/dashboard/WeeklyInsightCard"
import { LocalDateTime } from "@/components/LocalDateTime"
import { skillColorFor } from "@/lib/skill-visuals"

const ACHIEVEMENT_DATE_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
const SESSION_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
}

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

  const weekStrip = weeklyTotals.map((d) => ({ label: d.label, hit: d.minutes > 0 }))

  return (
    <div className="flex-1 bg-[#FBF5EC] px-5 py-7 font-[family-name:var(--font-manrope)] text-[#241A14]">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 font-[family-name:var(--font-sora)] text-[26px] font-extrabold">
              Welcome back
            </h1>
            <p className="m-0 text-sm text-[#8A7B6C]">Here&apos;s how your focus is going.</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-[#241A14]/12 bg-white px-4 py-2 text-[13px] font-bold text-[#241A14]"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <StreakCounter
              currentStreak={appUser.currentStreak}
              longestStreak={appUser.longestStreak}
              weekStrip={weekStrip}
            />
          </div>
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-[28px] border border-[#241A14]/[0.06] bg-white px-5 py-7 text-center shadow-[0_12px_32px_-18px_rgba(36,26,20,0.18)]">
            <span className="text-[30px]">⏱️</span>
            <span className="font-[family-name:var(--font-sora)] text-[46px] leading-none font-extrabold">
              {totalFocusedHours}
            </span>
            <p className="m-0 text-[13px] font-semibold text-[#8A7B6C]">Total focused hours</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#241A14]/[0.06] bg-white p-5.5 shadow-[0_12px_28px_-18px_rgba(36,26,20,0.14)]">
            <p className="m-0 font-[family-name:var(--font-sora)] text-base font-bold">This week</p>
            <p className="mt-0.5 mb-4 text-[12.5px] text-[#8A7B6C]">Focused minutes per day</p>
            <WeeklyChart data={weeklyTotals} />
          </div>

          <div className="rounded-3xl border border-[#241A14]/[0.06] bg-white p-5.5 shadow-[0_12px_28px_-18px_rgba(36,26,20,0.14)]">
            <p className="m-0 font-[family-name:var(--font-sora)] text-base font-bold">Streak history</p>
            <p className="mt-0.5 mb-4 text-[12.5px] text-[#8A7B6C]">Last 60 days</p>
            <StreakHistoryChart />
          </div>
        </div>

        <div className="rounded-3xl border border-[#241A14]/[0.06] bg-white p-5.5 shadow-[0_12px_28px_-18px_rgba(36,26,20,0.14)]">
          <div className="mb-3.5 flex items-center justify-between">
            <p className="m-0 font-[family-name:var(--font-sora)] text-base font-bold">
              Recent achievements
            </p>
            <Link href="/achievements" className="text-[12.5px] font-bold text-[#FF5A3C]">
              View all →
            </Link>
          </div>
          {recentAchievements.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="m-0 text-sm text-[#8A7B6C]">
                No achievements yet — complete your first session to start unlocking
                them.
              </p>
              <Link
                href="/session"
                className="inline-block rounded-full bg-[linear-gradient(135deg,#FF9142,#EF2D46)] px-5 py-2.5 text-[13px] font-extrabold text-white"
              >
                Start a focus session
              </Link>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recentAchievements.map((entry) => (
                <div
                  key={entry.id}
                  className="flex min-w-[180px] shrink-0 items-center gap-2.5 rounded-2xl border border-[#FFE1A8] bg-[linear-gradient(135deg,#FFF7EC,#FFEFD6)] px-4 py-2.5"
                >
                  <span className="text-[26px]">{entry.achievement.icon}</span>
                  <div>
                    <p className="m-0 text-[13px] font-extrabold text-[#241A14]">
                      {entry.achievement.title}
                    </p>
                    <p className="m-0 text-[11px] text-[#A6895C]">
                      Unlocked{" "}
                      <LocalDateTime
                        iso={entry.unlockedAt.toISOString()}
                        options={ACHIEVEMENT_DATE_FORMAT}
                      />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-[#241A14]/[0.06] bg-white p-5.5 shadow-[0_12px_28px_-18px_rgba(36,26,20,0.14)]">
          <p className="m-0 mb-3.5 font-[family-name:var(--font-sora)] text-base font-bold">
            Recent sessions
          </p>
          {recentSessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="m-0 text-sm text-[#8A7B6C]">
                No completed sessions yet — your first one will show up here.
              </p>
              <Link
                href="/session"
                className="inline-block rounded-full bg-[linear-gradient(135deg,#FF9142,#EF2D46)] px-5 py-2.5 text-[13px] font-extrabold text-white"
              >
                Start your first session
              </Link>
            </div>
          ) : (
            <div className="flex flex-col">
              {recentSessions.map((session) => {
                const color = skillColorFor(session.skillId)
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 border-b border-[#241A14]/[0.06] py-3 last:border-b-0"
                  >
                    <div
                      className="flex size-[38px] shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ backgroundColor: `${color}1A` }}
                    >
                      {session.skillId ? "🎯" : "🌀"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-bold text-[#241A14]">
                        {session.skill?.name ?? "General"}
                      </p>
                      <p className="m-0 text-xs text-[#8A7B6C]">
                        {session.endedAt ? (
                          <LocalDateTime
                            iso={session.endedAt.toISOString()}
                            options={SESSION_DATE_FORMAT}
                          />
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="m-0 text-[13px] font-bold text-[#241A14]">
                        {session.actualMinutes ?? 0} min
                      </p>
                      <p
                        className="m-0 text-[11px]"
                        style={{ color: session.distractions === 0 ? "#17B26A" : "#B7A996" }}
                      >
                        {session.distractions}{" "}
                        {session.distractions === 1 ? "distraction" : "distractions"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <WeeklyInsightCard />
      </div>
    </div>
  )
}
