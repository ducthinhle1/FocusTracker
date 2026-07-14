import { prisma } from "@/lib/prisma"
import { dateKeyInTimezone, dateKeyToUtcNoon, shiftDateKey } from "@/lib/date"

/** Monday-anchored week-start key for the calendar day `key` is in. */
export function weekStartKeyFor(key: string, timezone: string): string {
  const dow = dateKeyToUtcNoon(key).getUTCDay() // 0=Sun..6=Sat (safe: noon-UTC anchor)
  const daysSinceMonday = (dow + 6) % 7
  return shiftDateKey(key, -daysSinceMonday, timezone)
}

export interface WeeklyHoursPoint {
  weekStart: string
  label: string
  hours: number
}

/**
 * Hours logged per calendar week (Monday-start) for a single skill, over the
 * last `weeks` weeks including the current one. Weeks with no sessions still
 * appear as zero-hour points, so the chart never breaks on sparse data.
 */
export async function computeSkillWeeklyHours(
  userId: string,
  skillId: string,
  timezone: string,
  weeks = 8
): Promise<WeeklyHoursPoint[]> {
  const todayKey = dateKeyInTimezone(new Date(), timezone)
  const currentWeekStart = weekStartKeyFor(todayKey, timezone)
  const weekStarts = Array.from({ length: weeks }, (_, i) =>
    shiftDateKey(currentWeekStart, -(weeks - 1 - i) * 7, timezone)
  )

  // Buffered well before the first week's UTC-noon anchor so an extreme
  // positive-offset timezone can't lose a session on the first local day.
  const bufferStart = new Date(
    dateKeyToUtcNoon(weekStarts[0]).getTime() - 36 * 3_600_000
  )
  const sessions = await prisma.session.findMany({
    where: { userId, skillId, completed: true, endedAt: { gte: bufferStart } },
    select: { endedAt: true, actualMinutes: true },
  })

  const minutesByWeekStart = new Map<string, number>(weekStarts.map((w) => [w, 0]))
  for (const session of sessions) {
    if (!session.endedAt) continue
    const dayKey = dateKeyInTimezone(session.endedAt, timezone)
    const weekStart = weekStartKeyFor(dayKey, timezone)
    if (minutesByWeekStart.has(weekStart)) {
      minutesByWeekStart.set(
        weekStart,
        (minutesByWeekStart.get(weekStart) ?? 0) + (session.actualMinutes ?? 0)
      )
    }
  }

  return weekStarts.map((weekStart) => ({
    weekStart,
    label: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(dateKeyToUtcNoon(weekStart)),
    hours: Math.round(((minutesByWeekStart.get(weekStart) ?? 0) / 60) * 10) / 10,
  }))
}
