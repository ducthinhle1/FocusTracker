"use client"

import { useEffect, useRef, useState } from "react"

const HOLD_DURATION_MS = 2500
const HOLD_RADIUS = 42
const HOLD_CIRCUMFERENCE = 2 * Math.PI * HOLD_RADIUS

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

  // Only the explicit "Keep Focusing" button counts as resisting the urge to
  // stop — dismissing via the backdrop or releasing an aborted hold early
  // are different interactions and don't increment the counter.
  function handleKeepFocusingClick() {
    onKeepFocusing()
    fetch("/api/users/resist-stop", { method: "POST" }).catch(() => {})
  }

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

  const minutesFocusedUnit = minutesFocused === 1 ? "minute" : "minutes"

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,16,12,0.55)] p-5 backdrop-blur-[2px]"
      onClick={() => stage === "prompt" && onKeepFocusing()}
    >
      <div
        className="w-full max-w-[380px] rounded-3xl bg-white px-6 py-7 text-center font-[family-name:var(--font-manrope)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mb-2.5 block text-[34px]">💛</span>
        <p className="m-0 mb-1 font-[family-name:var(--font-sora)] text-[17px] font-extrabold text-[#241A14]">
          Not ready to stop?
        </p>
        <p className="m-0 mb-5.5 text-[13.5px] leading-relaxed text-[#8A7B6C]">
          You&apos;ve focused for{" "}
          <strong className="font-bold text-[#241A14]">{minutesFocused}</strong>{" "}
          {minutesFocusedUnit} so far. We&apos;d hate for you to lose this session&apos;s
          progress toward your streak and achievements.
        </p>

        {stage === "prompt" && (
          <>
            <button
              type="button"
              onClick={handleKeepFocusingClick}
              className="w-full rounded-full bg-[linear-gradient(135deg,#FF9142,#EF2D46)] py-4 text-[15px] font-extrabold text-white shadow-[0_14px_28px_-14px_rgba(239,45,70,0.5)]"
            >
              Keep Focusing
            </button>
            <button
              type="button"
              onClick={() => setStage("hold")}
              className="mt-3.5 text-xs text-[#B7A996] underline underline-offset-2"
            >
              Still stop
            </button>
          </>
        )}

        {stage === "hold" && (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onPointerDown={startHold}
              onPointerUp={releaseHold}
              onPointerLeave={releaseHold}
              onContextMenu={(e) => e.preventDefault()}
              className="relative flex size-24 select-none items-center justify-center rounded-full outline-none"
              aria-label="Press and hold for 2.5 seconds to stop the session"
            >
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={HOLD_RADIUS}
                  fill="none"
                  stroke="rgba(224,59,59,0.15)"
                  strokeWidth="7"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={HOLD_RADIUS}
                  fill="none"
                  stroke="#E03B3B"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={HOLD_CIRCUMFERENCE}
                  strokeDashoffset={HOLD_CIRCUMFERENCE * (1 - progress)}
                  style={progress === 0 ? { transition: "stroke-dashoffset 150ms" } : undefined}
                />
              </svg>
              <span className="text-[13px] font-bold text-[#E03B3B]">Hold</span>
            </button>
            <p className="m-0 text-xs text-[#B7A996]">
              Press and hold for 2.5 seconds to stop
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
