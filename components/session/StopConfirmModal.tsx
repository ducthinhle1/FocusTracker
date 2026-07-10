"use client"

import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const HOLD_DURATION_MS = 2500

interface StopConfirmModalProps {
  open: boolean
  minutesFocused: number
  onKeepFocusing: () => void
  onConfirmStop: () => void
}

export function StopConfirmModal({
  open,
  minutesFocused,
  onKeepFocusing,
  onConfirmStop,
}: StopConfirmModalProps) {
  const [stage, setStage] = useState<"prompt" | "hold">("prompt")
  const [progress, setProgress] = useState(0)
  const [prevOpen, setPrevOpen] = useState(open)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)
  const confirmedRef = useRef(false)

  // Reset to the initial prompt every time the modal is (re)opened. Adjusting
  // state directly during render (rather than in an effect) avoids an extra
  // render pass — see https://react.dev/learn/you-might-not-need-an-effect
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setStage("prompt")
      setProgress(0)
    }
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  if (!open) return null

  function cancelHold() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setProgress(0)
  }

  function startHold() {
    confirmedRef.current = false
    startRef.current = performance.now()

    const loop = (now: number) => {
      const elapsed = now - startRef.current
      const ratio = Math.min(1, elapsed / HOLD_DURATION_MS)
      setProgress(ratio)

      if (ratio >= 1) {
        confirmedRef.current = true
        rafRef.current = null
        onConfirmStop()
        return
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }

  function releaseHold() {
    if (confirmedRef.current) return
    cancelHold()
    onKeepFocusing()
  }

  const circumference = 2 * Math.PI * 20

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={() => stage === "prompt" && onKeepFocusing()}
    >
      <div
        className="w-full max-w-sm rounded-xl border bg-card p-6 text-card-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-foreground">
          You&apos;ve focused for{" "}
          <span className="font-medium">{minutesFocused}</span>{" "}
          {minutesFocused === 1 ? "minute" : "minutes"}{" "}
          so far. Stopping now means this session won&apos;t count toward
          your streak or any achievement.
        </p>

        <div className="mt-6 flex flex-col items-center gap-4">
          {stage === "prompt" && (
            <>
              <Button onClick={onKeepFocusing} className="w-full" size="lg">
                Keep Focusing
              </Button>
              <button
                type="button"
                onClick={() => setStage("hold")}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Still Stop
              </button>
            </>
          )}

          {stage === "hold" && (
            <>
              <button
                type="button"
                onPointerDown={startHold}
                onPointerUp={releaseHold}
                onPointerLeave={releaseHold}
                onContextMenu={(e) => e.preventDefault()}
                className="relative flex size-24 select-none items-center justify-center rounded-full outline-none"
                aria-label="Press and hold for 2.5 seconds to stop the session"
              >
                <svg
                  className="absolute inset-0 -rotate-90"
                  viewBox="0 0 44 44"
                >
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="3"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill="none"
                    className={cn(
                      "stroke-destructive",
                      progress === 0 && "transition-[stroke-dashoffset] duration-150"
                    )}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                  />
                </svg>
                <span className="text-xs font-medium text-destructive">
                  Hold
                </span>
              </button>
              <p className="text-xs text-muted-foreground">
                Press and hold for 2.5 seconds to stop
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
