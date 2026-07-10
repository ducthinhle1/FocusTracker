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
  const plannedMinutes = Number(body?.plannedMinutes)

  if (
    !Number.isInteger(plannedMinutes) ||
    plannedMinutes < 1 ||
    plannedMinutes > 180
  ) {
    return NextResponse.json(
      { error: "plannedMinutes must be an integer between 1 and 180." },
      { status: 400 }
    )
  }

  // skillId is optional (null/omitted = "General"). If provided, verify it
  // actually belongs to this user rather than trusting the client value.
  let skillId: string | null = null
  if (body?.skillId != null) {
    const skill = await prisma.skill.findUnique({ where: { id: body.skillId } })
    if (!skill || skill.userId !== user.id) {
      return NextResponse.json({ error: "Invalid skill." }, { status: 400 })
    }
    skillId = skill.id
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      plannedMinutes,
      completed: false,
      skillId,
    },
  })

  return NextResponse.json({
    id: session.id,
    startedAt: session.startedAt,
    plannedMinutes: session.plannedMinutes,
    skillId: session.skillId,
  })
}
