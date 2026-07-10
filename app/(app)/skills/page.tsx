import { redirect } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { SkillProgressBar } from "@/components/skills/SkillProgressBar"
import { AddSkillForm } from "@/components/skills/AddSkillForm"
import { DeleteSkillButton } from "@/components/skills/DeleteSkillButton"

export default async function SkillsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [skills, totals] = await Promise.all([
    prisma.skill.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.session.groupBy({
      by: ["skillId"],
      where: { userId: user.id, completed: true, skillId: { not: null } },
      _sum: { actualMinutes: true },
    }),
  ])

  const minutesBySkillId = new Map(
    totals.map((t) => [t.skillId as string, t._sum.actualMinutes ?? 0])
  )

  return (
    <div className="flex-1 bg-background px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Skills</h1>
          <p className="text-sm text-muted-foreground">
            Tag your focus sessions to a skill to track progress over time.
          </p>
        </div>

        {skills.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t added any skills yet. Add one below to start
                tracking progress per skill.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {skills.map((skill) => (
              <Card key={skill.id}>
                <CardContent className="flex items-center justify-between gap-4">
                  <Link href={`/skills/${skill.id}`} className="flex-1 min-w-0">
                    <p className="font-medium text-foreground hover:underline">
                      {skill.name}
                    </p>
                    <div className="mt-2">
                      <SkillProgressBar
                        minutesLogged={minutesBySkillId.get(skill.id) ?? 0}
                        targetHours={skill.targetHours}
                      />
                    </div>
                  </Link>
                  <DeleteSkillButton skillId={skill.id} skillName={skill.name} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AddSkillForm />
      </div>
    </div>
  )
}
