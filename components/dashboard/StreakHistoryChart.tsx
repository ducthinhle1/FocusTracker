"use client"

import { useEffect, useState } from "react"

interface StreakPoint {
  date: string
  streak: number
}

const CHART_W = 340
const CHART_H = 160
const PAD_TOP = 14
const PAD_BOTTOM = 26
const PAD_LEFT = 22
const GRID_TARGET_TICKS = 3
const TARGET_X_LABELS = 6

// Picks a "nice" round step (1/2/5/10 x a power of ten) so axis labels read
// as 0/20/40 rather than 0/23.33/46.67. `integerOnly` rounds the step up to
// a whole number, since streak-days are never fractional.
function niceStep(maxValue: number, targetTicks: number, integerOnly = false) {
  if (maxValue <= 0) return 1
  const roughStep = maxValue / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const residual = roughStep / magnitude
  let niceResidual: number
  if (residual > 5) niceResidual = 10
  else if (residual > 2) niceResidual = 5
  else if (residual > 1) niceResidual = 2
  else niceResidual = 1
  const step = niceResidual * magnitude
  return integerOnly ? Math.max(1, Math.round(step)) : step
}

// "date" is a plain YYYY-MM-DD calendar key (already resolved in the user's
// timezone server-side), so it's parsed into local date components rather
// than through `new Date(string)` — that would reinterpret it as UTC
// midnight and could shift the displayed day by one in the browser's zone.
function formatShortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

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

  // Never padded out to an arbitrary fixed "nice" max (e.g. always 5) when
  // the real max streak is 1 — niceStep only rounds up to the *next* round
  // tick above the actual data, so a tiny streak still fills most of the
  // chart instead of looking flat. Same reasoning as the earlier Recharts
  // Y-axis fix, just expressed in raw SVG geometry now.
  const maxStreak = Math.max(1, ...points.map((p) => p.streak))
  const usableH = CHART_H - PAD_TOP - PAD_BOTTOM
  const innerW = CHART_W - PAD_LEFT
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0

  const yStep = niceStep(maxStreak, GRID_TARGET_TICKS, true)
  const yTickCount = Math.ceil(maxStreak / yStep)
  const axisMax = yStep * yTickCount
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => i * yStep)

  const coords = points.map((p, i) => ({
    x: PAD_LEFT + i * stepX,
    y: PAD_TOP + (usableH - (p.streak / axisMax) * usableH),
  }))
  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ")
  const baselineY = PAD_TOP + usableH
  const areaPath = `${linePath} L${CHART_W.toFixed(1)},${baselineY.toFixed(1)} L${PAD_LEFT.toFixed(1)},${baselineY.toFixed(1)} Z`
  const endPoint = coords[coords.length - 1]

  const labelEvery = Math.max(1, Math.round(points.length / TARGET_X_LABELS))
  const xLabels = points
    .map((p, i) => ({ i, date: p.date }))
    .filter(({ i }) => i % labelEvery === 0 || i === points.length - 1)

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

      {yTicks.map((tick) => {
        const y = PAD_TOP + (usableH - (tick / axisMax) * usableH)
        return (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              y1={y}
              x2={CHART_W}
              y2={y}
              stroke="#241A14"
              strokeOpacity={0.07}
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 6}
              y={y + 3}
              textAnchor="end"
              fontSize={9}
              fontWeight={600}
              fill="#B7A996"
            >
              {tick}
            </text>
          </g>
        )
      })}

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

      {xLabels.map(({ i, date }) => (
        <text
          key={date}
          x={coords[i].x}
          y={CHART_H - 4}
          textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
          fontSize={9}
          fontWeight={600}
          fill="#B7A996"
        >
          {formatShortDate(date)}
        </text>
      ))}
    </svg>
  )
}
