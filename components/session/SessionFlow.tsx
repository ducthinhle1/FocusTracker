"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Timer } from "@/components/session/Timer"
import { StopConfirmModal } from "@/components/session/StopConfirmModal"
import { SkillPicker, type SkillOption } from "@/components/session/SkillPicker"

const DURATION_PRESETS = [15, 25, 45, 60] as const

interface ActiveSession {
  id: string
  startedAt: string
  plannedMinutes: number
}

interface UnlockedAchievement {
  title: string
  description: string
  icon: string
}

interface CompletedSessionStats {
  actualMinutes: number | null
  distractions: number
  completed: boolean
  currentStreak: number
  newlyUnlockedAchievements: UnlockedAchievement[]
  skillName: string | null
}

interface SessionFlowProps {
  initialSession: ActiveSession | null
  skills: SkillOption[]
}

const REDIRECT_SECONDS = 8
const INSIGHT_TIMEOUT_MS = 10_000

// Fetches a personalized post-session insight for one session. Keyed by
// sessionId in the parent so a new session naturally resets loading/insight
// state via remount, instead of resetting state imperatively inside an
// effect. Fails silently (renders nothing) on network errors or timeout —
// this is a nice-to-have layered on top of a session flow that already
// succeeded. Calls `onSettled` exactly once, whether the fetch succeeds,
// fails, or times out, so the parent knows when it's safe to start the
// auto-redirect countdown.
function PostSessionInsight({
  sessionId,
  onSettled,
}: {
  sessionId: string
  onSettled: () => void
}) {
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), INSIGHT_TIMEOUT_MS)

    fetch(`/api/insights?type=post_session&sessionId=${sessionId}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setInsight(data?.content ?? null)
      })
      .catch(() => {
        if (!cancelled) setInsight(null)
      })
      .finally(() => {
        clearTimeout(timeoutId)
        if (!cancelled) {
          setLoading(false)
          onSettled()
        }
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [sessionId, onSettled])

  if (!loading && !insight) return null

  return (
    <Card className="w-full">
      <CardContent className="py-3">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            Generating your insight...
          </p>
        ) : (
          <p className="text-sm text-foreground">{insight}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function SessionFlow({ initialSession, skills }: SessionFlowProps) {
  const router = useRouter()
  const [session, setSession] = useState<ActiveSession | null>(initialSession)
  const [phase, setPhase] = useState<"skill" | "picker" | "running" | "complete">(
    initialSession ? "running" : "skill"
  )
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [redirectSeconds, setRedirectSeconds] = useState(REDIRECT_SECONDS)
  // The countdown only starts once the post-session insight has finished
  // loading (succeeded, failed, or timed out) — never while it's in flight.
  const [insightSettled, setInsightSettled] = useState(false)
  const [prevPhase, setPrevPhase] = useState(phase)

  // Reset the auto-redirect countdown right when a session freshly
  // completes. Adjusting state directly during render (rather than in an
  // effect) avoids an extra render pass — see
  // https://react.dev/learn/you-might-not-need-an-effect
  if (phase !== prevPhase) {
    setPrevPhase(phase)
    if (phase === "complete") {
      setRedirectSeconds(REDIRECT_SECONDS)
      // No session id means there's nothing to fetch an insight for — don't
      // block the countdown waiting on a callback that will never fire.
      setInsightSettled(!session)
    }
  }

  const handleInsightSettled = useCallback(() => setInsightSettled(true), [])
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null)
  const [customMinutes, setCustomMinutes] = useState("")
  const [showCustom, setShowCustom] = useState(false)
  const [durationError, setDurationError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [distractions, setDistractions] = useState(0)
  const [stopModalOpen, setStopModalOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completedStats, setCompletedStats] =
    useState<CompletedSessionStats | null>(null)

  const distractionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const distractionsRef = useRef(0)
  useEffect(() => {
    distractionsRef.current = distractions
  }, [distractions])

  // Distraction tracking: only while a session is actively running.
  useEffect(() => {
    if (phase !== "running") return

    function handleVisibilityChange() {
      if (document.hidden) {
        distractionTimeoutRef.current = setTimeout(() => {
          setDistractions((d) => d + 1)
          distractionTimeoutRef.current = null
        }, 3000)
      } else if (distractionTimeoutRef.current) {
        clearTimeout(distractionTimeoutRef.current)
        distractionTimeoutRef.current = null
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (distractionTimeoutRef.current) {
        clearTimeout(distractionTimeoutRef.current)
        distractionTimeoutRef.current = null
      }
    }
  }, [phase])

  // Ticks the countdown down and redirects to the dashboard at 0. Gated on
  // insightSettled so the countdown never runs while the AI insight is still
  // loading. The cleanup here cancels the pending tick whenever `phase` or
  // `insightSettled` changes (e.g. "Start New Session") or the component
  // unmounts (navigating away manually), so a stray redirect can never fire
  // after the user has left.
  useEffect(() => {
    if (phase !== "complete" || !insightSettled) return
    if (redirectSeconds <= 0) {
      router.push("/dashboard")
      return
    }
    const timeout = setTimeout(() => setRedirectSeconds((s) => s - 1), 1000)
    return () => clearTimeout(timeout)
  }, [phase, insightSettled, redirectSeconds, router])

  async function completeSession(id: string, completed: boolean) {
    if (completing) return
    setCompleting(true)
    try {
      const res = await fetch(`/api/sessions/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed,
          distractions: distractionsRef.current,
        }),
      })
      const data = await res.json()
      setCompletedStats({
        actualMinutes: data.actualMinutes,
        distractions: data.distractions,
        completed: data.completed,
        currentStreak: data.currentStreak ?? 0,
        newlyUnlockedAchievements: data.newlyUnlockedAchievements ?? [],
        skillName: data.skillName ?? null,
      })
      setPhase("complete")
      setStopModalOpen(false)
    } finally {
      setCompleting(false)
    }
  }

  async function handleStart(minutes: number) {
    setDurationError(null)
    setStarting(true)
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plannedMinutes: minutes, skillId: selectedSkillId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setDurationError(data?.error ?? "Could not start session.")
        return
      }

      const data = await res.json()
      setSession(data)
      setDistractions(0)
      setElapsedSeconds(0)
      setPhase("running")
    } finally {
      setStarting(false)
    }
  }

  function handleCustomSubmit() {
    const minutes = Number(customMinutes)
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
      setDurationError("Enter a whole number of minutes between 1 and 180.")
      return
    }
    handleStart(minutes)
  }

  function resetToPicker() {
    setSession(null)
    setCompletedStats(null)
    setSelectedSkillId(null)
    setSelectedMinutes(null)
    setCustomMinutes("")
    setShowCustom(false)
    setDurationError(null)
    setDistractions(0)
    setPhase("skill")
  }

  if (phase === "skill") {
    return (
      <SkillPicker
        skills={skills}
        onSelect={(skillId) => {
          setSelectedSkillId(skillId)
          setPhase("picker")
        }}
      />
    )
  }

  if (phase === "picker") {
    const selectedSkillName = skills.find((s) => s.id === selectedSkillId)?.name

    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Start a focus session</CardTitle>
          <CardDescription className="flex items-center justify-between gap-2">
            <span>Focusing on: {selectedSkillName ?? "General"}</span>
            <button
              type="button"
              onClick={() => setPhase("skill")}
              className="shrink-0 underline underline-offset-4 hover:text-foreground"
            >
              Change
            </button>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {DURATION_PRESETS.map((minutes) => (
              <Button
                key={minutes}
                type="button"
                variant={selectedMinutes === minutes ? "default" : "outline"}
                onClick={() => {
                  setSelectedMinutes(minutes)
                  setShowCustom(false)
                  setDurationError(null)
                }}
              >
                {minutes} min
              </Button>
            ))}
          </div>

          <Button
            type="button"
            variant={showCustom ? "default" : "outline"}
            onClick={() => {
              setShowCustom(true)
              setSelectedMinutes(null)
              setDurationError(null)
            }}
          >
            Custom
          </Button>

          {showCustom && (
            <Input
              type="number"
              min={1}
              max={180}
              placeholder="Minutes (1-180)"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
            />
          )}

          {durationError && (
            <p className="text-sm text-destructive">{durationError}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            disabled={
              starting ||
              (showCustom ? customMinutes.trim() === "" : selectedMinutes === null)
            }
            onClick={() =>
              showCustom ? handleCustomSubmit() : handleStart(selectedMinutes!)
            }
          >
            {starting ? "Starting..." : "Start"}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (phase === "running" && session) {
    const minutesFocusedSoFar = Math.floor(elapsedSeconds / 60)

    return (
      <>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Focusing</CardTitle>
            <CardDescription>
              {session.plannedMinutes} minute session
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <Timer
              startedAt={session.startedAt}
              plannedMinutes={session.plannedMinutes}
              onTick={({ elapsedSeconds }) => setElapsedSeconds(elapsedSeconds)}
              onComplete={() => completeSession(session.id, true)}
            />
            <p className="text-sm text-muted-foreground">
              Distractions: <span className="font-medium">{distractions}</span>
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setStopModalOpen(true)}
            >
              Stop
            </Button>
          </CardFooter>
        </Card>

        <StopConfirmModal
          open={stopModalOpen}
          minutesFocused={minutesFocusedSoFar}
          onKeepFocusing={() => setStopModalOpen(false)}
          onConfirmStop={() => completeSession(session.id, false)}
        />
      </>
    )
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {completedStats?.completed ? "Session complete!" : "Session stopped"}
          </CardTitle>
          <CardDescription>Here&apos;s how it went.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-foreground">
            Skill:{" "}
            <span className="font-medium">
              {completedStats?.skillName ?? "General"}
            </span>
          </p>
          <p className="text-sm text-foreground">
            Minutes focused:{" "}
            <span className="font-medium">
              {completedStats?.actualMinutes ?? 0}
            </span>
          </p>
          <p className="text-sm text-foreground">
            Distractions:{" "}
            <span className="font-medium">
              {completedStats?.distractions ?? 0}
            </span>
          </p>
          {completedStats?.completed && (
            <p className="text-sm text-foreground">
              Current streak:{" "}
              <span className="font-medium">
                {completedStats.currentStreak}{" "}
                {completedStats.currentStreak === 1 ? "day" : "days"}
              </span>
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-center text-xs text-muted-foreground">
            {insightSettled
              ? `Returning to Dashboard in ${redirectSeconds}s...`
              : "Reading your insight..."}
          </p>
          <div className="flex w-full gap-2">
            <Button className="flex-1" onClick={resetToPicker}>
              Start New Session
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">View Dashboard Now</Link>
            </Button>
          </div>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/achievements">View achievements</Link>
          </Button>
        </CardFooter>
      </Card>

      {session && (
        <PostSessionInsight
          key={session.id}
          sessionId={session.id}
          onSettled={handleInsightSettled}
        />
      )}

      {completedStats?.newlyUnlockedAchievements.map((achievement, index) => (
        <Card
          key={achievement.title}
          className="w-full animate-achievement-pop border-primary/30 bg-primary/5"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          <CardContent className="flex items-center gap-3 py-1">
            <span className="text-3xl">{achievement.icon}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Achievement unlocked: {achievement.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {achievement.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
