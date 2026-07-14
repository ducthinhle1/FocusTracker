import { redirect } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/achievement-definitions"
import { LocalDateTime } from "@/components/LocalDateTime"

const UNLOCKED_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
}

export default async function AchievementsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [achievements, unlocked] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({ where: { userId: user.id } }),
  ])

  // Clear the "new achievement" nav badge now that the user has seen this
  // page. Fire-and-forget-free: awaited so the badge is gone by the time
  // they navigate elsewhere.
  await prisma.userAchievement.updateMany({
    where: { userId: user.id, viewed: false },
    data: { viewed: true },
  })

  const unlockedByAchievementId = new Map(
    unlocked.map((entry) => [entry.achievementId, entry.unlockedAt])
  )

  const keyOrder: string[] = ACHIEVEMENT_DEFINITIONS.map((def) => def.key)
  const sorted = [...achievements].sort(
    (a, b) => keyOrder.indexOf(a.key) - keyOrder.indexOf(b.key)
  )

  const total = achievements.length
  const unlockedCount = unlocked.length
  const progressPct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0

  return (
    <div className="flex-1 bg-[#FBF5EC] px-4 py-8 sm:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="m-0 font-[family-name:var(--font-sora)] text-2xl font-extrabold text-[#241A14] sm:text-[28px]">
            Achievements
          </h1>
          <p className="m-0 mt-1 text-sm text-[#8A7B6C]">
            {unlockedCount} of {total} unlocked
          </p>
        </div>

        <div className="rounded-2xl border border-[#241A14]/[0.06] bg-white px-5 py-4">
          <div className="mb-2 flex items-center justify-between text-[13px] font-bold">
            <span className="text-[#241A14]">Overall progress</span>
            <span className="text-[#FF5A3C]">{progressPct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#241A14]/[0.06]">
            <div
              className="h-full rounded-full bg-[linear-gradient(135deg,#FF9142,#EF2D46)] transition-[width] duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {unlockedCount === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#241A14]/[0.06] bg-white px-5 py-8 text-center">
            <p className="m-0 text-sm text-[#8A7B6C]">
              No achievements unlocked yet — complete a focus session to earn
              your first one.
            </p>
            <Link
              href="/session"
              className="rounded-full bg-[linear-gradient(135deg,#FF9142,#EF2D46)] px-5 py-2.5 text-sm font-bold text-white"
            >
              Start a focus session
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((achievement) => {
            const unlockedAt = unlockedByAchievementId.get(achievement.id)
            const isUnlocked = !!unlockedAt

            return (
              <div
                key={achievement.id}
                className={
                  isUnlocked
                    ? "relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border border-[#FFE1A8] bg-[linear-gradient(135deg,#FFF7EC,#FFEFD6)] px-3 py-5 text-center"
                    : "flex flex-col items-center gap-1.5 rounded-2xl border border-[#241A14]/[0.06] bg-white px-3 py-5 text-center opacity-55 grayscale"
                }
              >
                {isUnlocked && (
                  <span
                    aria-hidden
                    className="animate-fs-sheen pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.55)_50%,transparent_60%)]"
                  />
                )}
                <span className="text-[34px] leading-none">{achievement.icon}</span>
                <p className="m-0 text-[13px] font-extrabold text-[#241A14]">
                  {achievement.title}
                </p>
                <p className="m-0 text-[11.5px] leading-snug text-[#8A7B6C]">
                  {achievement.description}
                </p>
                {isUnlocked && (
                  <p className="m-0 mt-0.5 text-[10.5px] font-semibold text-[#B7862E]">
                    Unlocked{" "}
                    <LocalDateTime
                      iso={unlockedAt.toISOString()}
                      options={UNLOCKED_DATE_FORMAT}
                    />
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
