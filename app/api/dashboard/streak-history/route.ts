import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { computeStreakHistory } from "@/lib/dashboard"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const appUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  const points = await computeStreakHistory(user.id, appUser.timezone, 60)

  return NextResponse.json({ points })
}
