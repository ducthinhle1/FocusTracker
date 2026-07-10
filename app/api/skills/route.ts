import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""

  if (!name) {
    return NextResponse.json({ error: "Skill name is required." }, { status: 400 })
  }

  let targetHours: number | null = null
  if (body?.targetHours !== null && body?.targetHours !== undefined && body?.targetHours !== "") {
    const parsed = Number(body.targetHours)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return NextResponse.json(
        { error: "Target hours must be a positive whole number." },
        { status: 400 }
      )
    }
    targetHours = parsed
  }

  const skill = await prisma.skill.create({
    data: { userId: user.id, name, targetHours },
  })

  return NextResponse.json(skill)
}
