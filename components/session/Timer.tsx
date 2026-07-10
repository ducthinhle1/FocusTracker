"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface TimerProps {
  startedAt: string
  plannedMinutes: number
  onTick?: (info: { elapsedSeconds: number; remainingSeconds: number }) => void
  onComplete?: () => void
  className?: string
}

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

export function Timer({
  startedAt,
  plannedMinutes,
  onTick,
  onComplete,
  className,
}: TimerProps) {
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

  return (
    <div
      className={cn(
        "font-mono text-7xl font-semibold tabular-nums",
        className
      )}
      aria-live="off"
    >
      {formatMMSS(remainingSeconds)}
    </div>
  )
}
