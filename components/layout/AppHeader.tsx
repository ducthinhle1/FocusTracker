import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { LiveClock } from "@/components/layout/LiveClock"
import { NavBar } from "@/components/NavBar"

export async function AppHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const unviewedCount = user
    ? await prisma.userAchievement.count({
        where: { userId: user.id, viewed: false },
      })
    : 0

  return (
    <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:px-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="shrink-0 text-sm font-bold tracking-tight text-foreground"
        >
          Focus<span className="text-primary">Streak</span>
        </Link>
        <NavBar hasUnviewedAchievements={unviewedCount > 0} />
      </div>
      <LiveClock />
    </header>
  )
}
