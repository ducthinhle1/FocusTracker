import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { checkResistedTemptationUnlock, type UnlockedAchievement } from "@/lib/gamification"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { keepFocusingCount: { increment: 1 } },
  })

  const unlocked = await checkResistedTemptationUnlock(
    user.id,
    updated.keepFocusingCount
  )
  const newlyUnlockedAchievements: UnlockedAchievement[] = unlocked ? [unlocked] : []

  return NextResponse.json({
    keepFocusingCount: updated.keepFocusingCount,
    newlyUnlockedAchievements,
  })
}
