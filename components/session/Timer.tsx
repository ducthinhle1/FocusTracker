"use client"

import { useEffect, useRef, useState } from "react"

interface TimerProps {
  startedAt: string
  plannedMinutes: number
  onTick?: (info: { elapsedSeconds: number; remainingSeconds: number }) => void
  onComplete?: () => void
}

const RADIUS = 88
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function formatMMSS(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds)
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function computeRemainingSeconds(startedAt: string, plannedMinutes: number) {
  const elapsedMs = Date.now() - new Date(startedAt).getTime()
  const totalMs = plannedMinutes * 60_000
  return Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000))
}

export function Timer({ startedAt, plannedMinutes, onTick, onComplete }: TimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    computeRemainingSeconds(startedAt, plannedMinutes)
  )
  const completedFired = useRef(false)
  const onTickRef = useRef(onTick)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    completedFired.current = false

    function tick() {
      const remaining = computeRemainingSeconds(startedAt, plannedMinutes)
      setRemainingSeconds(remaining)
      const totalSeconds = plannedMinutes * 60
      onTickRef.current?.({
        remainingSeconds: remaining,
        elapsedSeconds: totalSeconds - remaining,
      })

      if (remaining <= 0 && !completedFired.current) {
        completedFired.current = true
        onCompleteRef.current?.()
      }
    }

    tick()
    // Ticks 4x/second so the 0:00 boundary (and thus completion) is
    // detected promptly, not just once per displayed second.
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [startedAt, plannedMinutes])

  const totalSeconds = plannedMinutes * 60
  const fraction = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0
  const dashOffset = CIRCUMFERENCE * (1 - fraction)

  return (
    <div className="animate-fs-breathe relative flex size-[280px] items-center justify-center">
      <div
        aria-hidden
        className="animate-fs-glow-pulse absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(47,111,237,0.16),transparent_70%)]"
      />
      <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke="rgba(47,111,237,0.12)"
          strokeWidth="10"
        />
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke="#2F6FED"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset .25s linear" }}
        />
      </svg>
      <div className="text-center" aria-live="off">
        <p className="m-0 font-[family-name:var(--font-sora)] text-[52px] font-extrabold tabular-nums text-[#1E3A6E]">
          {formatMMSS(remainingSeconds)}
        </p>
        <p className="mt-1 mb-0 text-[12.5px] font-semibold text-[#6E86AE]">
          {plannedMinutes}-minute session
        </p>
      </div>
    </div>
  )
}
