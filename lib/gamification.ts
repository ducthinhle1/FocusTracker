import { Prisma } from "@/generated/prisma/client"
import type { Session } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { dateKeyInTimezone, dateKeyToUtcNoon, daysBetweenKeys, shiftDateKey } from "@/lib/date"
import { weekStartKeyFor } from "@/lib/skills"

export interface UnlockedAchievement {
  title: string
  description: string
  icon: string
}

export interface GamificationResult {
  currentStreak: number
  longestStreak: number
  newlyUnlocked: UnlockedAchievement[]
  skillName: string | null
}

function hourInTimezone(date: Date, timeZone: string): number {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).format(date)
  // Midnight can render as "24" in some ICU implementations; normalize to 0.
  return Number(value) % 24
}

/**
 * Whether the user has a completed session on both the Saturday and the
 * Sunday of the Monday-anchored calendar week containing `endedAt`. Only the
 * week of the just-completed session needs checking — earlier weeks' data
 * can't change, so if a prior week ever had both days the achievement would
 * already have unlocked back then.
 */
async function hasWeekendPair(
  userId: string,
  endedAt: Date,
  timeZone: string
): Promise<boolean> {
  const dayKey = dateKeyInTimezone(endedAt, timeZone)
  const weekStart = weekStartKeyFor(dayKey, timeZone)
  const saturdayKey = shiftDateKey(weekStart, 5, timeZone)
  const sundayKey = shiftDateKey(weekStart, 6, timeZone)

  // Buffered well beyond the Sat/Sun UTC-noon anchors so an extreme
  // timezone offset can't lose a session that's really on one of those days.
  const bufferStart = new Date(
    dateKeyToUtcNoon(saturdayKey).getTime() - 36 * 3_600_000
  )
  const bufferEnd = new Date(
    dateKeyToUtcNoon(sundayKey).getTime() + 36 * 3_600_000
  )
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      completed: true,
      endedAt: { gte: bufferStart, lte: bufferEnd },
    },
    select: { endedAt: true },
  })

  let hasSaturday = false
  let hasSunday = false
  for (const s of sessions) {
    if (!s.endedAt) continue
    const key = dateKeyInTimezone(s.endedAt, timeZone)
    if (key === saturdayKey) hasSaturday = true
    if (key === sundayKey) hasSunday = true
  }
  return hasSaturday && hasSunday
}

/** Whether a skill's logged hours now meet or exceed its target, if it has one. */
async function checkSkillTargetReached(
  userId: string,
  skillId: string
): Promise<boolean> {
  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    select: { targetHours: true },
  })
  if (!skill?.targetHours) return false

  const agg = await prisma.session.aggregate({
    where: { userId, skillId, completed: true },
    _sum: { actualMinutes: true },
  })
  const hours = (agg._sum.actualMinutes ?? 0) / 60
  return hours >= skill.targetHours
}

interface AchievementContext {
  currentStreak: number
  completedSessionCount: number
  totalMinutesBefore: number
  totalMinutesAfter: number
  distractions: number
  endedHour: number
  // Available to any future skill-conditioned achievement rule; no current
  // rule depends on it.
  skillName: string | null
  actualMinutes: number
  distinctSkillCount: number
  hasWeekendPair: boolean
  skillTargetReached: boolean
  hasHadStreakReset: boolean
}

const ACHIEVEMENT_RULES: Record<string, (ctx: AchievementContext) => boolean> = {
  first_session: (ctx) => ctx.completedSessionCount === 1,
  streak_3: (ctx) => ctx.currentStreak === 3,
  streak_7: (ctx) => ctx.currentStreak === 7,
  streak_30: (ctx) => ctx.currentStreak === 30,
  hours_10: (ctx) => ctx.totalMinutesBefore < 600 && ctx.totalMinutesAfter >= 600,
  hours_50: (ctx) => ctx.totalMinutesBefore < 3000 && ctx.totalMinutesAfter >= 3000,
  zero_distraction: (ctx) => ctx.distractions === 0,
  night_owl: (ctx) => ctx.endedHour >= 22 || ctx.endedHour < 5,
  early_bird: (ctx) => ctx.endedHour >= 5 && ctx.endedHour < 7,
  sessions_10: (ctx) => ctx.completedSessionCount === 10,
  sessions_50: (ctx) => ctx.completedSessionCount === 50,
  sessions_100: (ctx) => ctx.completedSessionCount === 100,
  long_session: (ctx) => ctx.actualMinutes >= 60,
  weekend_warrior: (ctx) => ctx.hasWeekendPair,
  skill_master: (ctx) => ctx.skillTargetReached,
  explorer: (ctx) => ctx.distinctSkillCount === 3,
  comeback: (ctx) => ctx.hasHadStreakReset && ctx.currentStreak === 7,
}

/**
 * Updates the streak and unlocks any newly-qualifying achievements for a
 * session that just finished with `completed: true`. Must not be called for
 * a session stopped early — those don't count toward streaks/achievements.
 *
 * `skillName` is the name of the skill the session was tagged to (or null
 * for a general/untagged session) — passed in rather than re-fetched since
 * the caller already resolved it.
 */
export async function applyGamification(
  session: Session,
  skillName: string | null
): Promise<GamificationResult> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
  })
  const endedAt = session.endedAt!

  const todayKey = dateKeyInTimezone(endedAt, user.timezone)
  const lastKey = user.lastSessionDate
    ? dateKeyInTimezone(user.lastSessionDate, user.timezone)
    : null

  let currentStreak: number
  if (lastKey === todayKey) {
    currentStreak = user.currentStreak
  } else if (lastKey !== null && daysBetweenKeys(lastKey, todayKey) === 1) {
    currentStreak = user.currentStreak + 1
  } else {
    currentStreak = 1
  }
  const longestStreak = Math.max(user.longestStreak, currentStreak)

  // Lifetime flag: set the first time a streak actually resets (drops from
  // an active >1 streak down to 1), never unset afterward.
  const justReset = user.currentStreak > 1 && currentStreak === 1
  const hasHadStreakReset = user.hasHadStreakReset || justReset

  await prisma.user.update({
    where: { id: user.id },
    data: { currentStreak, longestStreak, lastSessionDate: endedAt, hasHadStreakReset },
  })

  const [
    completedSessionCount,
    totalMinutesAgg,
    unlockedAchievements,
    allAchievements,
    distinctSkillSessions,
    weekendPair,
    skillTargetReached,
  ] = await Promise.all([
    prisma.session.count({ where: { userId: user.id, completed: true } }),
    prisma.session.aggregate({
      where: { userId: user.id, completed: true },
      _sum: { actualMinutes: true },
    }),
    prisma.userAchievement.findMany({
      where: { userId: user.id },
      select: { achievement: { select: { key: true } } },
    }),
    prisma.achievement.findMany(),
    prisma.session.findMany({
      where: { userId: user.id, completed: true, skillId: { not: null } },
      distinct: ["skillId"],
      select: { skillId: true },
    }),
    hasWeekendPair(user.id, endedAt, user.timezone),
    session.skillId
      ? checkSkillTargetReached(user.id, session.skillId)
      : Promise.resolve(false),
  ])

  const totalMinutesAfter = totalMinutesAgg._sum.actualMinutes ?? 0
  const totalMinutesBefore = totalMinutesAfter - (session.actualMinutes ?? 0)
  const alreadyUnlockedKeys = new Set(
    unlockedAchievements.map((entry) => entry.achievement.key)
  )

  const ctx: AchievementContext = {
    currentStreak,
    completedSessionCount,
    totalMinutesBefore,
    totalMinutesAfter,
    distractions: session.distractions,
    endedHour: hourInTimezone(endedAt, user.timezone),
    skillName,
    actualMinutes: session.actualMinutes ?? 0,
    distinctSkillCount: distinctSkillSessions.length,
    hasWeekendPair: weekendPair,
    skillTargetReached,
    hasHadStreakReset,
  }

  const newlyUnlocked: UnlockedAchievement[] = []

  for (const achievement of allAchievements) {
    if (alreadyUnlockedKeys.has(achievement.key)) continue
    const rule = ACHIEVEMENT_RULES[achievement.key]
    if (!rule?.(ctx)) continue

    try {
      await prisma.userAchievement.create({
        data: { userId: user.id, achievementId: achievement.id },
      })
      newlyUnlocked.push({
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
      })
    } catch (error) {
      // Unique constraint race (e.g. a duplicate completion request) —
      // someone else already unlocked it, just skip.
      const isDuplicate =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      if (!isDuplicate) throw error
    }
  }

  return { currentStreak, longestStreak, newlyUnlocked, skillName }
}

/**
 * Unlocks "resisted_temptation" the moment a user's keepFocusingCount hits 5.
 * Independent of session completion — tied to a modal interaction instead,
 * so it's a standalone check rather than part of `ACHIEVEMENT_RULES`/`applyGamification`.
 */
export async function checkResistedTemptationUnlock(
  userId: string,
  keepFocusingCount: number
): Promise<UnlockedAchievement | null> {
  if (keepFocusingCount !== 5) return null

  const achievement = await prisma.achievement.findUnique({
    where: { key: "resisted_temptation" },
  })
  if (!achievement) return null

  const alreadyUnlocked = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  })
  if (alreadyUnlocked) return null

  try {
    await prisma.userAchievement.create({
      data: { userId, achievementId: achievement.id },
    })
  } catch (error) {
    const isDuplicate =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    if (!isDuplicate) throw error
    return null
  }

  return {
    title: achievement.title,
    description: achievement.description,
    icon: achievement.icon,
  }
}
