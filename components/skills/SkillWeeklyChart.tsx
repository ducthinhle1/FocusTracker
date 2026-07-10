"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ValueType } from "recharts/types/component/DefaultTooltipContent"

interface SkillWeeklyChartProps {
  data: { weekStart: string; label: string; hours: number }[]
}

const BAR_COLOR = "#2a78d6"

export function SkillWeeklyChart({ data }: SkillWeeklyChartProps) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e1e0d9" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#898781", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#898781", fontSize: 12 }}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "#e1e0d9", opacity: 0.4 }}
            contentStyle={{
              background: "#fcfcfb",
              border: "1px solid #e1e0d9",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#0b0b0b", fontWeight: 600 }}
            formatter={(value: ValueType | undefined) => [`${value ?? 0}h`, "Logged"]}
          />
          <Bar dataKey="hours" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
