import { redirect, notFound } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { computeSkillWeeklyHours } from "@/lib/skills"
import { skillColorFor } from "@/lib/skill-visuals"
import { SkillWeeklyChart } from "@/components/skills/SkillWeeklyChart"
import { LocalDateTime } from "@/components/LocalDateTime"

// Rendered client-side in the browser's own local timezone (see
// LocalDateTime) — never the user's stored `timezone` field, which is only
// for server-side week bucketing (the "hours per week" chart below).
const SESSION_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
}

const STATUS_PILL_COMPLETED =
  "rounded-full bg-[#17B26A]/[0.08] px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap text-[#17B26A]"
const STATUS_PILL_STOPPED =
  "rounded-full bg-[#241A14]/[0.06] px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap text-[#8A7B6C]"

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const appUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  const skill = await prisma.skill.findUnique({ where: { id } })

  if (!skill || skill.userId !== user.id) {
    notFound()
  }

  const [totalAgg, sessionCount, weeklyHours, sessions] = await Promise.all([
    prisma.session.aggregate({
      where: { userId: user.id, skillId: id, completed: true },
      _sum: { actualMinutes: true },
    }),
    prisma.session.count({ where: { userId: user.id, skillId: id, completed: true } }),
    computeSkillWeeklyHours(user.id, id, appUser.timezone, 8),
    prisma.session.findMany({
      where: { userId: user.id, skillId: id },
      orderBy: { startedAt: "desc" },
    }),
  ])

  const hoursLogged = (totalAgg._sum.actualMinutes ?? 0) / 60
  const color = skillColorFor(skill.id)
  const hasTarget = !!skill.targetHours
  const percent = hasTarget
    ? Math.min(100, Math.round((hoursLogged / skill.targetHours!) * 100))
    : 0

  return (
    <div className="flex-1 bg-[#FBF5EC] px-5 py-7 font-[family-name:var(--font-manrope)] text-[#241A14]">
      <div className="mx-auto flex max-w-[760px] flex-col gap-4">
        <div>
          <Link href="/skills" className="text-[13px] font-bold text-[#8A7B6C]">
            ← Back to skills
          </Link>

          <div className="mt-3.5 flex items-center gap-3.5">
            <div
              className="flex size-13 shrink-0 items-center justify-center rounded-2xl text-[26px]"
              style={{ backgroundColor: `${color}1A` }}
            >
              🧩
            </div>
            <div>
              <h1 className="m-0 font-[family-name:var(--font-sora)] text-[22px] font-extrabold">
                {skill.name}
              </h1>
              <p className="mt-0.5 mb-0 text-[13px] text-[#8A7B6C]">
                {hoursLogged.toFixed(1)}h logged all-time ·{" "}
                <span className="font-medium text-[#6B5E4F]">
                  {sessionCount} {sessionCount === 1 ? "session" : "sessions"} completed
                </span>
              </p>
            </div>
          </div>
        </div>

        {hasTarget && (
          <div
            className="rounded-[22px] border p-5"
            style={{
              background: `linear-gradient(135deg, ${color}18, ${color}05)`,
              borderColor: `${color}30`,
            }}
          >
            <div className="mb-2.5 flex items-baseline justify-between">
              <span
                className="font-[family-name:var(--font-sora)] text-xl font-extrabold"
                style={{ color }}
              >
                {percent}%
              </span>
              <span className="text-[12.5px] font-semibold text-[#8A7B6C]">
                to {skill.targetHours}h goal
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#241A14]/[0.06]">
              <div
                className="h-full rounded-full"
                style={{ width: `${percent}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )}

        <div className="rounded-[22px] border border-[#241A14]/[0.06] bg-white p-5">
          <p className="m-0 font-[family-name:var(--font-sora)] text-[15px] font-bold">
            Weekly hours
          </p>
          <p className="mt-0.5 mb-3.5 text-xs text-[#8A7B6C]">Last 8 weeks</p>
          <SkillWeeklyChart data={weeklyHours} color={color} />
        </div>

        <div className="rounded-[22px] border border-[#241A14]/[0.06] bg-white p-5">
          <p className="m-0 mb-3 font-[family-name:var(--font-sora)] text-[15px] font-bold">
            Session history
          </p>
          {sessions.length === 0 ? (
            <p className="m-0 text-[13.5px] text-[#8A7B6C]">
              No sessions tagged to this skill yet.{" "}
              <Link href="/session" className="font-semibold text-[#241A14] underline">
                Start one
              </Link>
              .
            </p>
          ) : (
            <>
              {/* Table on sm+ screens — a stacked card list reads better
                  on narrow screens than a cramped 4-column table. */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-[13.5px]">
                  <thead>
                    <tr className="border-b border-[#241A14]/8 text-left">
                      <th className="px-0 pr-4 pb-2 text-xs font-bold text-[#8A7B6C]">
                        Date
                      </th>
                      <th className="px-0 pr-4 pb-2 text-xs font-bold text-[#8A7B6C]">
                        Duration
                      </th>
                      <th className="px-0 pr-4 pb-2 text-xs font-bold text-[#8A7B6C]">
                        Distractions
                      </th>
                      <th className="px-0 pb-2 text-xs font-bold text-[#8A7B6C]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#241A14]/[0.06]">
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-0 py-2.5 pr-4 font-semibold text-[#241A14]">
                          <LocalDateTime
                            iso={(session.endedAt ?? session.startedAt).toISOString()}
                            options={SESSION_DATE_FORMAT}
                          />
                        </td>
                        <td className="px-0 py-2.5 pr-4 text-[#6B5E4F]">
                          {session.actualMinutes ?? 0} min
                        </td>
                        <td className="px-0 py-2.5 pr-4 text-[#6B5E4F]">
                          {session.distractions}
                        </td>
                        <td className="px-0 py-2.5">
                          <span
                            className={
                              session.completed ? STATUS_PILL_COMPLETED : STATUS_PILL_STOPPED
                            }
                          >
                            {session.completed ? "Completed" : "Stopped early"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 sm:hidden">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col gap-1.5 rounded-2xl bg-[#241A14]/[0.03] px-3.5 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#241A14]">
                        <LocalDateTime
                          iso={(session.endedAt ?? session.startedAt).toISOString()}
                          options={SESSION_DATE_FORMAT}
                        />
                      </span>
                      <span
                        className={
                          session.completed ? STATUS_PILL_COMPLETED : STATUS_PILL_STOPPED
                        }
                      >
                        {session.completed ? "Completed" : "Stopped early"}
                      </span>
                    </div>
                    <p className="m-0 text-xs text-[#8A7B6C]">
                      {session.actualMinutes ?? 0} min · {session.distractions}{" "}
                      {session.distractions === 1 ? "distraction" : "distractions"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <Link
          href="/session"
          className="inline-block self-start rounded-full border border-[#241A14]/12 bg-white px-5 py-2.5 text-[13.5px] font-extrabold text-[#241A14]"
        >
          Start a focus session
        </Link>
      </div>
    </div>
  )
}
