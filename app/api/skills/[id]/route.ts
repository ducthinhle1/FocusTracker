import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
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

  const skill = await prisma.skill.findUnique({ where: { id } })
  if (!skill || skill.userId !== user.id) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 })
  }

  // The Session.skillId foreign key is ON DELETE SET NULL, so this
  // automatically turns the skill's sessions into "General" sessions
  // instead of deleting them.
  await prisma.skill.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
