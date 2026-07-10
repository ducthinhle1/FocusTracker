import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { callClaude } from "@/lib/claude"

const DAILY_RATE_LIMIT = 20
const WEEKLY_MIN_SESSIONS = 3
const WEEKLY_FALLBACK_MESSAGE =
  "Complete a few more sessions this week to unlock a personalized insight."
const GRACEFUL_FALLBACK_MESSAGE =
  "Insights are temporarily unavailable — check back after your next session."

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS

const POST_SESSION_SYSTEM_PROMPT = `You are a focus-coaching assistant embedded in a productivity app. Given the stats from a user's just-completed focus session, write ONE genuine, specific observation in 1-2 sentences.

Rules:
- Reference the actual numbers provided (duration, distractions, streak, skill) — don't be vague.
- Never use generic praise phrases like "great job", "well done", "awesome work", "keep it up", or similar boilerplate.
- If the session was cut short or had a lot of distractions, it's fine to note that honestly rather than being falsely positive.
- Output only the observation itself — no preamble, no headers, no quotation marks.`

const WEEKLY_SYSTEM_PROMPT = `You are a focus-coaching assistant embedded in a productivity app. Given a summary of a user's focus sessions from the past 7 days, write 2-3 sentences that:
1. Point out ONE concrete pattern in the data (e.g. the time of day they focus best, a skill they spend the most or least time on, or a trend in session length/frequency).
2. Add ONE specific encouraging observation grounded in the actual numbers.

Rules:
- Reference real numbers, times, or skill names from the data given — don't be vague.
- Never use generic praise phrases like "great job", "well done", "awesome work", "keep it up", or similar boilerplate.
- Output only the insight itself — no preamble, no headers, no quotation marks.`

function minutesAgo(ms: number): Date {
  return new Date(Date.now() - ms)
}

async function withinDailyRateLimit(userId: string): Promise<boolean> {
  const count = await prisma.insight.count({
    where: { userId, createdAt: { gte: minutesAgo(ONE_DAY_MS) } },
  })
  return count < DAILY_RATE_LIMIT
}

async function mostRecentCachedInsight(userId: string, type: string) {
  return prisma.insight.findFirst({
    where: { userId, type },
    orderBy: { createdAt: "desc" },
  })
}

async function handlePostSession(userId: string, sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { skill: { select: { name: true } } },
  })

  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const existing = await prisma.insight.findFirst({
    where: { sessionId, type: "post_session" },
  })
  if (existing) {
    return NextResponse.json({ content: existing.content, cached: true })
  }

  if (!(await withinDailyRateLimit(userId))) {
    const recent = await mostRecentCachedInsight(userId, "post_session")
    return NextResponse.json({
      content: recent?.content ?? GRACEFUL_FALLBACK_MESSAGE,
      cached: true,
    })
  }

  const appUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  const statsLines = [
    `Planned duration: ${session.plannedMinutes} min`,
    `Actual duration: ${session.actualMinutes ?? 0} min`,
    `Completed: ${session.completed ? "yes" : "no, stopped early"}`,
    `Distractions logged: ${session.distractions}`,
    `Skill: ${session.skill?.name ?? "General (untagged)"}`,
    `Current streak: ${appUser.currentStreak} day${appUser.currentStreak === 1 ? "" : "s"}`,
  ]

  const content = await callClaude(POST_SESSION_SYSTEM_PROMPT, statsLines.join("\n"))

  if (!content) {
    return NextResponse.json({ content: GRACEFUL_FALLBACK_MESSAGE, cached: false })
  }

  const insight = await prisma.insight.create({
    data: { userId, type: "post_session", content, sessionId },
  })

  return NextResponse.json({ content: insight.content, cached: false })
}

async function handleWeekly(userId: string) {
  const existing = await prisma.insight.findFirst({
    where: { userId, type: "weekly", createdAt: { gte: minutesAgo(SEVEN_DAYS_MS) } },
    orderBy: { createdAt: "desc" },
  })
  if (existing) {
    return NextResponse.json({ content: existing.content, cached: true })
  }

  const appUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  const sessions = await prisma.session.findMany({
    where: {
      userId,
      completed: true,
      endedAt: { gte: minutesAgo(SEVEN_DAYS_MS) },
    },
    orderBy: { startedAt: "asc" },
    include: { skill: { select: { name: true } } },
  })

  if (sessions.length < WEEKLY_MIN_SESSIONS) {
    return NextResponse.json({ content: WEEKLY_FALLBACK_MESSAGE, cached: false })
  }

  if (!(await withinDailyRateLimit(userId))) {
    const recent = await mostRecentCachedInsight(userId, "weekly")
    return NextResponse.json({
      content: recent?.content ?? GRACEFUL_FALLBACK_MESSAGE,
      cached: true,
    })
  }

  const sessionFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: appUser.timezone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  })

  const sessionLines = sessions.map((session) => {
    const when = sessionFormatter.format(session.startedAt)
    const skill = session.skill?.name ?? "General"
    return `${when} — ${skill} — ${session.actualMinutes ?? 0} min — ${session.distractions} distraction${session.distractions === 1 ? "" : "s"}`
  })

  const content = await callClaude(
    WEEKLY_SYSTEM_PROMPT,
    `Sessions from the past 7 days:\n${sessionLines.join("\n")}`
  )

  if (!content) {
    return NextResponse.json({ content: GRACEFUL_FALLBACK_MESSAGE, cached: false })
  }

  const insight = await prisma.insight.create({
    data: { userId, type: "weekly", content, sessionId: null },
  })

  return NextResponse.json({ content: insight.content, cached: false })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const type = request.nextUrl.searchParams.get("type")

  if (type === "post_session") {
    const sessionId = request.nextUrl.searchParams.get("sessionId")
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }
    return handlePostSession(user.id, sessionId)
  }

  if (type === "weekly") {
    return handleWeekly(user.id)
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 })
}
