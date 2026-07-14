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
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[#241A14]/8 bg-[#FBF5EC]/90 px-5 py-3.5 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-5">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-1.5 font-[family-name:var(--font-sora)] text-lg font-extrabold text-[#241A14]"
        >
          <span className="text-xl">🔥</span>
          <span>
            Focus
            <span className="bg-[linear-gradient(135deg,#FF9142,#EF2D46)] bg-clip-text text-transparent">
              Streak
            </span>
          </span>
        </Link>
        <NavBar hasUnviewedAchievements={unviewedCount > 0} />
      </div>
      <LiveClock />
    </header>
  )
}
