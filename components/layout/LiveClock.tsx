"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

function formatClock(date: Date) {
  return {
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date),
    day: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date),
  }
}

interface LiveClockProps {
  className?: string
}

export function LiveClock({ className }: LiveClockProps) {
  // Starts null so the server-rendered markup and the client's first paint
  // match exactly (the server has no meaningful "browser local time"); the
  // real time fills in a moment after mount, in the effect below.
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    // Browser-only clock: must run after mount to avoid an SSR/client
    // hydration mismatch (the server has no meaningful "browser local time").
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date())

    let interval: ReturnType<typeof setInterval> | undefined
    // Align the first tick to the next minute boundary rather than firing
    // 60s from whenever the component happened to mount, so the display
    // never sits stale for up to a minute after the clock actually ticks.
    const msUntilNextMinute = 60_000 - (Date.now() % 60_000)
    const alignmentTimeout = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 60_000)
    }, msUntilNextMinute)

    return () => {
      clearTimeout(alignmentTimeout)
      if (interval) clearInterval(interval)
    }
  }, [])

  if (!now) {
    return <div className={cn("h-9", className)} aria-hidden />
  }

  const { time, day } = formatClock(now)

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-[#241A14]/8 bg-white px-3.5 py-1.5 font-[family-name:var(--font-manrope)] shadow-[0_1px_2px_rgba(36,26,20,0.04)]",
        className
      )}
    >
      <span className="hidden text-xs font-semibold text-[#8A7B6C] sm:inline">
        {day}
      </span>
      <span className="font-[family-name:var(--font-sora)] text-[13px] font-bold tabular-nums text-[#241A14]">
        {time}
      </span>
    </div>
  )
}
