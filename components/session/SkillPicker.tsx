import Link from "next/link"

import { skillColorFor } from "@/lib/skill-visuals"

export interface SkillOption {
  id: string
  name: string
  targetHours: number | null
  minutesLogged: number
}

interface SkillPickerProps {
  skills: SkillOption[]
  onSelect: (skillId: string | null) => void
}

export function SkillPicker({ skills, onSelect }: SkillPickerProps) {
  return (
    <div className="w-full max-w-[420px] animate-fs-fade-up">
      <div className="mb-5.5 text-center">
        <h1 className="m-0 mb-1.5 font-[family-name:var(--font-sora)] text-2xl font-extrabold text-[#241A14]">
          What are you focusing on?
        </h1>
        <p className="m-0 text-sm text-[#8A7B6C]">
          Tag this session to a skill, or just dive in.
        </p>
      </div>

      {skills.length === 0 ? (
        <p className="text-center text-sm text-[#8A7B6C]">
          You haven&apos;t added any skills yet.{" "}
          <Link href="/skills" className="font-semibold text-[#241A14] underline">
            Add one
          </Link>{" "}
          to start tracking progress per skill.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {skills.map((skill) => {
            const hours = Math.round((skill.minutesLogged / 60) * 10) / 10
            const progressLabel = skill.targetHours
              ? `${hours}h / ${skill.targetHours}h logged`
              : `${hours}h logged`
            const color = skillColorFor(skill.id)
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => onSelect(skill.id)}
                className="flex w-full items-center gap-3.5 rounded-[18px] border-2 border-[#241A14]/8 bg-white px-4 py-3.5 text-left transition-colors hover:border-[#241A14]/20"
              >
                <div
                  className="flex size-[42px] shrink-0 items-center justify-center rounded-[13px] text-xl"
                  style={{ backgroundColor: `${color}1A` }}
                >
                  🧩
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[15px] font-bold text-[#241A14]">
                    {skill.name}
                  </p>
                  <p className="m-0 text-xs text-[#8A7B6C]">{progressLabel}</p>
                </div>
                <span className="text-lg text-[#D8CDBE]">→</span>
              </button>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => onSelect(null)}
        className="mt-1 w-full rounded-[18px] border-2 border-dashed border-[#241A14]/15 px-4 py-3.5 text-sm font-bold text-[#8A7B6C]"
      >
        Skip / General Focus
      </button>
    </div>
  )
}
