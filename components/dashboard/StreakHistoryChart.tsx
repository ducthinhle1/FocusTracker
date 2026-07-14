"use client"

import { useEffect, useState } from "react"

interface StreakPoint {
  date: string
  streak: number
}

const CHART_W = 340
const CHART_H = 160
const PAD_TOP = 14
const PAD_BOTTOM = 10

export function StreakHistoryChart() {
  const [points, setPoints] = useState<StreakPoint[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/dashboard/streak-history")
      .then((res) => {
        if (!res.ok) throw new Error("request failed")
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setPoints(data.points)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (failed) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-[#8A7B6C]">
        Couldn&apos;t load streak history.
      </p>
    )
  }

  if (!points) {
    return <div className="h-40 w-full animate-pulse rounded-md bg-[#241A14]/[0.06]" />
  }

  // Scales tightly to the actual data (never padded out to an arbitrary
  // "nice" max like 5 when the real max streak is 1) — same reasoning as the
  // earlier Recharts Y-axis fix, just expressed in raw SVG geometry now.
  const maxStreak = Math.max(1, ...points.map((p) => p.streak))
  const usableH = CHART_H - PAD_TOP - PAD_BOTTOM
  const stepX = points.length > 1 ? CHART_W / (points.length - 1) : 0

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: PAD_TOP + (usableH - (p.streak / maxStreak) * usableH),
  }))
  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ")
  const areaPath = `${linePath} L${CHART_W.toFixed(1)},${CHART_H} L0,${CHART_H} Z`
  const endPoint = coords[coords.length - 1]

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="h-40 w-full overflow-visible"
      role="img"
      aria-label="Streak history, last 60 days"
    >
      <defs>
        <linearGradient id="streakFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF5A3C" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#FF5A3C" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#streakFill)" />
      <path
        d={linePath}
        fill="none"
        stroke="#EF2D46"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 700,
          animation: "fs-dash-draw 1.1s ease-out",
        }}
      />
      {endPoint && (
        <circle cx={endPoint.x} cy={endPoint.y} r={4.5} fill="#EF2D46" stroke="#fff" strokeWidth={2} />
      )}
    </svg>
  )
}
