import { redirect } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { skillColorFor } from "@/lib/skill-visuals"
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
    <div className="flex-1 bg-[#FBF5EC] px-5 py-7 font-[family-name:var(--font-manrope)] text-[#241A14]">
      <div className="mx-auto flex max-w-[760px] flex-col gap-4.5">
        <div>
          <h1 className="m-0 font-[family-name:var(--font-sora)] text-[26px] font-extrabold">
            Skills
          </h1>
          <p className="m-0 text-sm text-[#8A7B6C]">
            Tag focus sessions to a skill to watch it level up.
          </p>
        </div>

        {skills.length === 0 ? (
          <div className="rounded-[22px] border border-[#241A14]/[0.06] bg-white px-5 py-8 text-center">
            <p className="m-0 text-sm text-[#8A7B6C]">
              You haven&apos;t added any skills yet. Add one below to start tracking
              progress per skill.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {skills.map((skill) => {
              const color = skillColorFor(skill.id)
              return (
                <div
                  key={skill.id}
                  className="flex items-center gap-4 rounded-[22px] border border-[#241A14]/[0.06] bg-white px-5 py-4.5 shadow-[0_10px_24px_-16px_rgba(36,26,20,0.14)]"
                >
                  <Link
                    href={`/skills/${skill.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <div
                      className="flex size-[46px] shrink-0 items-center justify-center rounded-2xl text-[22px]"
                      style={{ backgroundColor: `${color}1A` }}
                    >
                      🧩
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 mb-1.5 truncate text-[15.5px] font-extrabold text-[#241A14]">
                        {skill.name}
                      </p>
                      <SkillProgressBar
                        minutesLogged={minutesBySkillId.get(skill.id) ?? 0}
                        targetHours={skill.targetHours}
                        color={color}
                      />
                    </div>
                  </Link>
                  <DeleteSkillButton skillId={skill.id} skillName={skill.name} />
                </div>
              )
            })}
          </div>
        )}

        <AddSkillForm />
      </div>
    </div>
  )
}
