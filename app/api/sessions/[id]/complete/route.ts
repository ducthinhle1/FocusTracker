import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { applyGamification, type UnlockedAchievement } from "@/lib/gamification"

async function resolveSkillName(skillId: string | null): Promise<string | null> {
  if (!skillId) return null
  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    select: { name: true },
  })
  return skill?.name ?? null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const completed = body?.completed === true
  const distractions = Number.isInteger(body?.distractions)
    ? Math.max(0, body.distractions)
    : 0

  const session = await prisma.session.findUnique({ where: { id } })

  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  // Already ended (e.g. a duplicate request from a race between the
  // countdown reaching 0 and a resumed page) — return the stored result
  // instead of overwriting endedAt/actualMinutes a second time.
  if (session.endedAt) {
    const existingUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    return NextResponse.json({
      ...session,
      currentStreak: existingUser.currentStreak,
      longestStreak: existingUser.longestStreak,
      newlyUnlockedAchievements: [] as UnlockedAchievement[],
      skillName: await resolveSkillName(session.skillId),
    })
  }

  const endedAt = new Date()
  const actualMinutes = Math.round(
    (endedAt.getTime() - session.startedAt.getTime()) / 60000
  )

  const updated = await prisma.session.update({
    where: { id },
    data: {
      completed,
      distractions,
      endedAt,
      actualMinutes,
    },
  })

  const skillName = await resolveSkillName(updated.skillId)

  let currentStreak: number
  let longestStreak: number
  let newlyUnlockedAchievements: UnlockedAchievement[] = []

  // Streaks/achievements only count for sessions that ran to completion —
  // not ones ended early via the stop-friction flow.
  if (updated.completed) {
    const result = await applyGamification(updated, skillName)
    currentStreak = result.currentStreak
    longestStreak = result.longestStreak
    newlyUnlockedAchievements = result.newlyUnlocked
  } else {
    const existingUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    currentStreak = existingUser.currentStreak
    longestStreak = existingUser.longestStreak
  }

  return NextResponse.json({
    ...updated,
    currentStreak,
    longestStreak,
    newlyUnlockedAchievements,
    skillName,
  })
}
