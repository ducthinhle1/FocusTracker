"use client"

import { useEffect, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ValueType } from "recharts/types/component/DefaultTooltipContent"

interface StreakPoint {
  date: string
  streak: number
}

const LINE_COLOR = "#eb6834"

function formatShortDate(key: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}T12:00:00Z`))
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
      <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Couldn&apos;t load streak history.
      </p>
    )
  }

  if (!points) {
    return <div className="h-56 w-full animate-pulse rounded-md bg-muted" />
  }

  const data = points.map((p) => ({ ...p, label: formatShortDate(p.date) }))

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e1e0d9" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#898781", fontSize: 11 }}
            interval={Math.max(0, Math.ceil(data.length / 6) - 1)}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(1, dataMax)]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#898781", fontSize: 12 }}
            width={28}
          />
          <Tooltip
            cursor={{ stroke: "#c3c2b7" }}
            contentStyle={{
              background: "#fcfcfb",
              border: "1px solid #e1e0d9",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#0b0b0b", fontWeight: 600 }}
            formatter={(value: ValueType | undefined) => [
              `${value ?? 0} ${value === 1 ? "day" : "days"}`,
              "Streak",
            ]}
          />
          <Line
            type="monotone"
            dataKey="streak"
            stroke={LINE_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 5, fill: LINE_COLOR, stroke: "#fcfcfb", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
