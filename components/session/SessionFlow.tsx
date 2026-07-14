"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Timer } from "@/components/session/Timer"
import { StopConfirmModal } from "@/components/session/StopConfirmModal"
import { SkillPicker, type SkillOption } from "@/components/session/SkillPicker"
import { skillColorFor } from "@/lib/skill-visuals"

const DURATION_PRESETS = [15, 25, 45, 60] as const
const CONFETTI_EMOJI = ["🎉", "✨", "🎊", "⭐", "🔥", "💛", "🎉", "✨", "⭐", "🎊"]

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
    <div className="w-full rounded-2xl border border-[#241A14]/[0.06] bg-white px-5 py-4">
      {loading ? (
        <p className="m-0 flex items-center gap-2 text-sm text-[#8A7B6C]">
          <span className="size-3 animate-spin rounded-full border-2 border-[#8A7B6C]/30 border-t-[#8A7B6C]" />
          Generating your insight...
        </p>
      ) : (
        <p className="m-0 text-sm text-[#241A14]">{insight}</p>
      )}
    </div>
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
      <div className="w-full max-w-[420px] animate-fs-fade-up">
        <div className="mb-5.5 text-center">
          <p className="m-0 mb-1.5 text-[13px] font-bold text-[#8A7B6C]">
            Focusing on: <span className="text-[#241A14]">{selectedSkillName ?? "General"}</span>
            <button
              type="button"
              onClick={() => setPhase("skill")}
              className="ml-2 border-none bg-transparent p-0 text-[12.5px] font-bold text-[#FF5A3C]"
            >
              Change
            </button>
          </p>
          <h1 className="m-0 font-[family-name:var(--font-sora)] text-2xl font-extrabold text-[#241A14]">
            How long do you want to focus?
          </h1>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2.5">
          {DURATION_PRESETS.map((minutes) => {
            const active = selectedMinutes === minutes
            return (
              <button
                key={minutes}
                type="button"
                onClick={() => {
                  setSelectedMinutes(minutes)
                  setShowCustom(false)
                  setDurationError(null)
                }}
                className="flex flex-col items-center gap-0.5 rounded-2xl border-2 p-4"
                style={{
                  borderColor: active ? "transparent" : "rgba(36,26,20,0.1)",
                  background: active ? "linear-gradient(135deg,#FF9142,#EF2D46)" : "#fff",
                  color: active ? "#fff" : "#241A14",
                }}
              >
                <span className="font-[family-name:var(--font-sora)] text-[22px] font-extrabold">
                  {minutes}
                </span>
                <span className="text-xs font-semibold opacity-85">minutes</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCustom((c) => !c)
            setSelectedMinutes(null)
            setDurationError(null)
          }}
          className="w-full rounded-2xl border-2 p-3.5 text-sm font-bold"
          style={{
            borderColor: showCustom ? "transparent" : "rgba(36,26,20,0.1)",
            background: showCustom ? "linear-gradient(135deg,#FF9142,#EF2D46)" : "#fff",
            color: showCustom ? "#fff" : "#241A14",
          }}
        >
          Custom duration
        </button>

        {showCustom && (
          <input
            type="number"
            min={1}
            max={180}
            placeholder="Minutes (1–180)"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            className="mt-2.5 w-full rounded-2xl border-2 border-[#241A14]/10 px-3.5 py-3 font-[family-name:var(--font-manrope)] text-[15px] outline-none"
          />
        )}

        {durationError && (
          <p className="mt-2.5 mb-0 text-[13px] text-[#E03B3B]">{durationError}</p>
        )}

        <button
          type="button"
          disabled={
            starting ||
            (showCustom ? customMinutes.trim() === "" : selectedMinutes === null)
          }
          onClick={() =>
            showCustom ? handleCustomSubmit() : handleStart(selectedMinutes!)
          }
          className="mt-5 w-full rounded-full py-4 font-[family-name:var(--font-sora)] text-base font-extrabold text-white shadow-[0_16px_32px_-14px_rgba(239,45,70,0.45)] disabled:cursor-not-allowed"
          style={{
            background:
              starting || (showCustom ? customMinutes.trim() === "" : selectedMinutes === null)
                ? "#D8CDBE"
                : "linear-gradient(135deg,#FF9142,#EF2D46)",
            opacity:
              starting || (showCustom ? customMinutes.trim() === "" : selectedMinutes === null)
                ? 0.7
                : 1,
          }}
        >
          {starting ? "Starting..." : "Start Focus Session"}
        </button>
      </div>
    )
  }

  if (phase === "running" && session) {
    const skillColor = skillColorFor(selectedSkillId)
    const runningSkillLabel = skills.find((s) => s.id === selectedSkillId)?.name ?? "General"

    return (
      <>
        <div className="flex w-full flex-col items-center pt-5 animate-fs-fade-up">
          <div
            className="mb-7 flex items-center gap-2 rounded-full px-4 py-1.75"
            style={{ backgroundColor: `${skillColor}1A` }}
          >
            <span className="text-[15px]">{selectedSkillId ? "🎯" : "🌀"}</span>
            <span className="text-[13px] font-bold" style={{ color: skillColor }}>
              {runningSkillLabel}
            </span>
          </div>

          <Timer
            startedAt={session.startedAt}
            plannedMinutes={session.plannedMinutes}
            onTick={({ elapsedSeconds }) => setElapsedSeconds(elapsedSeconds)}
            onComplete={() => completeSession(session.id, true)}
          />

          <div className="mt-7.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#6E86AE]">
            <span>👁️</span>
            <span>
              {distractions} {distractions === 1 ? "distraction" : "distractions"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setStopModalOpen(true)}
            className="mt-10 border-none bg-transparent text-[13.5px] font-bold text-[#A9B8D6] underline underline-offset-2"
          >
            Stop
          </button>
        </div>

        <StopConfirmModal
          open={stopModalOpen}
          minutesFocused={Math.floor(elapsedSeconds / 60)}
          onKeepFocusing={() => setStopModalOpen(false)}
          onConfirmStop={() => completeSession(session.id, false)}
        />
      </>
    )
  }

  const completedNaturally = completedStats?.completed ?? true

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-3.5 animate-fs-fade-up">
      <div
        className="relative overflow-hidden rounded-[26px] px-6 py-7.5 text-center text-white"
        style={{
          background: completedNaturally
            ? "linear-gradient(135deg,#FF9142,#EF2D46)"
            : "linear-gradient(135deg,#8A93A6,#5F6B85)",
        }}
      >
        {completedNaturally &&
          CONFETTI_EMOJI.map((emoji, i) => (
            <span
              key={i}
              aria-hidden
              className="pointer-events-none absolute -top-2.5"
              style={{
                left: `${8 + i * 9}%`,
                fontSize: `${14 + (i % 3) * 4}px`,
                animation: `fs-confetti-fall ${1.4 + (i % 4) * 0.3}s ease-in ${i * 0.06}s forwards`,
              }}
            >
              {emoji}
            </span>
          ))}
        <span className="mb-1.5 block text-4xl">{completedNaturally ? "🎉" : "💛"}</span>
        <h2 className="m-0 mb-1 font-[family-name:var(--font-sora)] text-[22px] font-extrabold">
          {completedNaturally ? "Session complete!" : "Session stopped"}
        </h2>
        <p className="m-0 text-[13.5px] opacity-90">
          {completedNaturally
            ? "Nice focus — here's how it went."
            : "That's okay. Here's what you logged."}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border border-[#241A14]/[0.06] bg-white px-5 py-4.5">
        <div className="flex justify-between text-[13.5px]">
          <span className="text-[#8A7B6C]">Skill</span>
          <span className="font-bold text-[#241A14]">
            {completedStats?.skillName ?? "General"}
          </span>
        </div>
        <div className="flex justify-between text-[13.5px]">
          <span className="text-[#8A7B6C]">Minutes focused</span>
          <span className="font-bold text-[#241A14]">{completedStats?.actualMinutes ?? 0}</span>
        </div>
        <div className="flex justify-between text-[13.5px]">
          <span className="text-[#8A7B6C]">Distractions</span>
          <span className="font-bold text-[#241A14]">{completedStats?.distractions ?? 0}</span>
        </div>
        {completedStats?.completed && (
          <div className="flex justify-between border-t border-[#241A14]/[0.06] pt-2 text-[13.5px]">
            <span className="text-[#8A7B6C]">🔥 Current streak</span>
            <span className="font-extrabold text-[#EF2D46]">
              {completedStats.currentStreak}{" "}
              {completedStats.currentStreak === 1 ? "day" : "days"}
            </span>
          </div>
        )}
      </div>

      {session && (
        <PostSessionInsight
          key={session.id}
          sessionId={session.id}
          onSettled={handleInsightSettled}
        />
      )}

      {completedStats?.newlyUnlockedAchievements.map((achievement, index) => (
        <div
          key={achievement.title}
          className="animate-fs-achievement-pop flex items-center gap-3 rounded-[18px] border border-[#FFE1A8] bg-[linear-gradient(135deg,#FFF7EC,#FFEFD6)] px-4 py-3.5"
          style={{ animationDelay: `${index * 150}ms`, animationFillMode: "backwards" }}
        >
          <span className="text-[30px]">{achievement.icon}</span>
          <div>
            <p className="m-0 text-[13px] font-extrabold text-[#241A14]">
              Achievement unlocked: {achievement.title}
            </p>
            <p className="m-0 text-xs text-[#8A7B6C]">{achievement.description}</p>
          </div>
        </div>
      ))}

      <p className="m-0 text-center text-xs text-[#8A7B6C]">
        {insightSettled
          ? `Returning to Dashboard in ${redirectSeconds}s...`
          : "Reading your insight..."}
      </p>
      <div className="flex w-full gap-2.5">
        <button
          type="button"
          onClick={resetToPicker}
          className="flex-1 rounded-full bg-[linear-gradient(135deg,#FF9142,#EF2D46)] py-3.5 text-sm font-extrabold text-white"
        >
          Start New Session
        </button>
        <Link
          href="/dashboard"
          className="flex-1 rounded-full border-2 border-[#241A14]/10 py-3 text-center text-sm font-extrabold text-[#241A14]"
        >
          View Dashboard
        </Link>
      </div>
      <Link href="/achievements" className="text-center text-xs font-bold text-[#8A7B6C]">
        View achievements
      </Link>
    </div>
  )
}

// Explicitly reference the fs-achievement-pop animation class name once so
// build tooling doesn't tree-shake the globals.css keyframe as "unused" —
// harmless no-op kept for clarity alongside the className usage above.
