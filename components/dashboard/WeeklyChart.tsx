"use client"

interface WeeklyChartProps {
  data: { date: string; label: string; minutes: number }[]
}

const CHART_W = 340
const CHART_H = 160
const PAD_TOP = 18
const PAD_BOTTOM = 30
const BAR_GAP = 10
const BAR_COLOR = "#2F6FED"
const EMPTY_BAR_COLOR = "#E7E1D6"

export function WeeklyChart({ data }: WeeklyChartProps) {
  const n = data.length
  const barW = n > 0 ? (CHART_W - BAR_GAP * (n + 1)) / n : 0
  const maxMinutes = Math.max(60, ...data.map((d) => d.minutes))
  const usableH = CHART_H - PAD_TOP - PAD_BOTTOM

  const bars = data.map((d, i) => {
    const h = maxMinutes
      ? Math.max(d.minutes ? 6 : 3, (d.minutes / maxMinutes) * usableH)
      : 3
    const x = BAR_GAP + i * (barW + BAR_GAP)
    const y = PAD_TOP + (usableH - h)
    return {
      x,
      y,
      width: barW,
      height: h,
      labelX: x + barW / 2,
      valueY: y - 6,
      label: d.label,
      minutes: d.minutes,
      fill: d.minutes > 0 ? BAR_COLOR : EMPTY_BAR_COLOR,
      delay: i * 60,
    }
  })

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="h-40 w-full overflow-visible"
      role="img"
      aria-label="Focused minutes per day, last 7 days"
    >
      {bars.map((bar) => (
        <g key={bar.labelX}>
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={7}
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
            y={150}
            textAnchor="middle"
            fontSize={10.5}
            fontWeight={700}
            fill="#B7A996"
          >
            {bar.label}
          </text>
          {bar.minutes > 0 && (
            <text
              x={bar.labelX}
              y={bar.valueY}
              textAnchor="middle"
              fontSize={10.5}
              fontWeight={800}
              fill="#241A14"
            >
              {bar.minutes}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
