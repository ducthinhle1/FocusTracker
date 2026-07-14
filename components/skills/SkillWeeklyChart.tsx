"use client"

interface SkillWeeklyChartProps {
  data: { weekStart: string; label: string; hours: number }[]
  color?: string
}

const CHART_W = 340
const CHART_H = 150
const PAD_TOP = 10
const PAD_BOTTOM = 20
const GAP = 8
const EMPTY_BAR_COLOR = "#E7E1D6"

export function SkillWeeklyChart({ data, color = "#2F6FED" }: SkillWeeklyChartProps) {
  const n = data.length
  const barW = n > 0 ? (CHART_W - GAP * (n + 1)) / n : 0
  const maxHours = Math.max(1, ...data.map((d) => d.hours))
  const usableH = CHART_H - PAD_TOP - PAD_BOTTOM

  const bars = data.map((d, i) => {
    const h = d.hours > 0 ? Math.max(4, (d.hours / maxHours) * usableH) : 2
    const x = GAP + i * (barW + GAP)
    const y = PAD_TOP + (usableH - h)
    return {
      x,
      y,
      width: barW,
      height: h,
      labelX: x + barW / 2,
      label: d.label,
      fill: d.hours > 0 ? color : EMPTY_BAR_COLOR,
      delay: i * 50,
    }
  })

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="h-[140px] w-full overflow-visible"
      role="img"
      aria-label="Hours logged per week, last 8 weeks"
    >
      {bars.map((bar) => (
        <g key={bar.labelX}>
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={6}
            fill={bar.fill}
            className="animate-fs-bar-grow"
            style={{
              transformOrigin: `${bar.labelX}px ${PAD_TOP + usableH}px`,
              animationDelay: `${bar.delay}ms`,
              animationFillMode: "backwards",
              animationDuration: "0.6s",
              animationTimingFunction: "cubic-bezier(.22,1,.36,1)",
            }}
          />
          <text
            x={bar.labelX}
            y={140}
            textAnchor="middle"
            fontSize={9.5}
            fontWeight={700}
            fill="#B7A996"
          >
            {bar.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
