/** Calendar-day key (YYYY-MM-DD) for a moment, as seen in a given IANA timezone. */
export function dateKeyInTimezone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${map.year}-${map.month}-${map.day}`
}

/**
 * A day key anchored to UTC noon — a safe instant for arithmetic between
 * calendar days without landing on a different day after a timezone shift
 * (for all real-world offsets short of the rare UTC+12..+14 zones).
 */
export function dateKeyToUtcNoon(key: string): Date {
  return new Date(`${key}T12:00:00Z`)
}

export function daysBetweenKeys(fromKey: string, toKey: string): number {
  return Math.round(
    (dateKeyToUtcNoon(toKey).getTime() - dateKeyToUtcNoon(fromKey).getTime()) /
      86_400_000
  )
}

/** The day key `days` calendar days before (negative) or after (positive) `key`. */
export function shiftDateKey(key: string, days: number, timeZone: string): string {
  const shifted = new Date(dateKeyToUtcNoon(key).getTime() + days * 86_400_000)
  return dateKeyInTimezone(shifted, timeZone)
}
