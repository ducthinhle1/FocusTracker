import { prisma } from "@/lib/prisma"
import { dateKeyInTimezone, dateKeyToUtcNoon, shiftDateKey } from "@/lib/date"

export interface DailyMinutesPoint {
  date: string
  label: string
  minutes: number
}

/** Total focused minutes per day, for the last 7 calendar days (in `timezone`). */
export async function computeWeeklyTotals(
  userId: string,
  timezone: string
): Promise<DailyMinutesPoint[]> {
  const todayKey = dateKeyInTimezone(new Date(), timezone)
  const days = Array.from({ length: 7 }, (_, i) =>
    shiftDateKey(todayKey, -(6 - i), timezone)
  )
  const dayKeySet = new Set(days)

  // A loose buffer window (in plain UTC) — bucketing into precise,
  // timezone-aware calendar days happens below, in JS.
  const bufferStart = new Date(Date.now() - 9 * 86_400_000)
  const sessions = await prisma.session.findMany({
    where: { userId, completed: true, endedAt: { gte: bufferStart } },
    select: { endedAt: true, actualMinutes: true },
  })

  const totalsByDay = new Map<string, number>(days.map((d) => [d, 0]))
  for (const session of sessions) {
    if (!session.endedAt) continue
    const key = dateKeyInTimezone(session.endedAt, timezone)
    if (dayKeySet.has(key)) {
      totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + (session.actualMinutes ?? 0))
    }
  }

  return days.map((key) => ({
    date: key,
    // Read the weekday back from the key's own UTC-noon anchor (not the
    // user's timezone) — that anchor is what the key was derived from, so
    // this can never drift to an adjacent day.
    label: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(`${key}T12:00:00Z`)),
    minutes: totalsByDay.get(key) ?? 0,
  }))
}

export interface StreakHistoryPoint {
  date: string
  streak: number
}

/**
 * Daily streak value for each of the last `days` calendar days, reconstructed
 * on the fly from completed-session dates (never persisted). Per day: streak
 * = previous day's streak + 1 if a session happened that day, else 0. The
 * simulation starts at streak 0 on the first day of the window — it doesn't
 * credit any streak the user may have been carrying in from before it.
 */
export async function computeStreakHistory(
  userId: string,
  timezone: string,
  days = 60
): Promise<StreakHistoryPoint[]> {
  const todayKey = dateKeyInTimezone(new Date(), timezone)
  const startKey = shiftDateKey(todayKey, -(days - 1), timezone)

  // Buffered well before startKey's UTC-noon anchor so an extreme
  // positive-offset timezone (local day starts up to ~14h before UTC
  // midnight) can't lose a session that's really on the first local day.
  const bufferStart = new Date(dateKeyToUtcNoon(startKey).getTime() - 36 * 3_600_000)
  const sessions = await prisma.session.findMany({
    where: { userId, completed: true, endedAt: { gte: bufferStart } },
    select: { endedAt: true },
  })

  const sessionDayKeys = new Set(
    sessions
      .filter((s): s is { endedAt: Date } => s.endedAt !== null)
      .map((s) => dateKeyInTimezone(s.endedAt, timezone))
  )

  const points: StreakHistoryPoint[] = []
  let runningStreak = 0
  for (let i = 0; i < days; i++) {
    const key = shiftDateKey(startKey, i, timezone)
    runningStreak = sessionDayKeys.has(key) ? runningStreak + 1 : 0
    points.push({ date: key, streak: runningStreak })
  }

  return points
}
