import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { SessionFlow } from "@/components/session/SessionFlow"

export default async function SessionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // `completed` stays false forever on a session stopped early, so
  // `endedAt: null` is what actually distinguishes a still-running session.
  const [activeSession, skills] = await Promise.all([
    prisma.session.findFirst({
      where: { userId: user.id, completed: false, endedAt: null },
      orderBy: { startedAt: "desc" },
    }),
    prisma.skill.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <SessionFlow
        initialSession={
          activeSession
            ? {
                id: activeSession.id,
                startedAt: activeSession.startedAt.toISOString(),
                plannedMinutes: activeSession.plannedMinutes,
              }
            : null
        }
        skills={skills}
      />
    </div>
  )
}
