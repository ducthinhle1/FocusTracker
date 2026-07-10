import { redirect } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/achievement-definitions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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

  return (
    <div className="flex-1 bg-background px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Achievements
          </h1>
          <p className="text-sm text-muted-foreground">
            {unlocked.length} of {achievements.length} unlocked
          </p>
        </div>

        {unlocked.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No achievements unlocked yet — complete a focus session to
                earn your first one.
              </p>
              <Button asChild size="sm">
                <Link href="/session">Start a focus session</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sorted.map((achievement) => {
            const unlockedAt = unlockedByAchievementId.get(achievement.id)
            const isUnlocked = !!unlockedAt

            return (
              <Card
                key={achievement.id}
                className={cn(
                  "w-full transition-opacity",
                  !isUnlocked && "opacity-50 grayscale"
                )}
              >
                <CardContent className="flex items-start gap-3 py-2">
                  <span className="text-3xl">{achievement.icon}</span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      {achievement.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {achievement.description}
                    </p>
                    {isUnlocked && (
                      <p className="text-xs text-muted-foreground">
                        Unlocked{" "}
                        {unlockedAt.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        })}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
