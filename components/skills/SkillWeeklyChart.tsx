"use client"

interface SkillWeeklyChartProps {
  data: { weekStart: string; label: string; hours: number }[]
  color?: string
}

const CHART_W = 340
const CHART_H = 150
const PAD_TOP = 10
const PAD_BOTTOM = 20
const PAD_LEFT = 24
const GAP = 8
const EMPTY_BAR_COLOR = "#E7E1D6"
const GRID_TARGET_TICKS = 3

// Picks a "nice" round step (1/2/5/10 x a power of ten) so axis labels read
// as 0/1/2 rather than 0/0.83/1.67.
function niceStep(maxValue: number, targetTicks: number) {
  if (maxValue <= 0) return 1
  const roughStep = maxValue / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const residual = roughStep / magnitude
  let niceResidual: number
  if (residual > 5) niceResidual = 10
  else if (residual > 2) niceResidual = 5
  else if (residual > 1) niceResidual = 2
  else niceResidual = 1
  return niceResidual * magnitude
}

function formatTick(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function SkillWeeklyChart({ data, color = "#2F6FED" }: SkillWeeklyChartProps) {
  const n = data.length
  const innerW = CHART_W - PAD_LEFT
  const barW = n > 0 ? (innerW - GAP * (n + 1)) / n : 0
  const maxHours = Math.max(1, ...data.map((d) => d.hours))
  const usableH = CHART_H - PAD_TOP - PAD_BOTTOM

  const step = niceStep(maxHours, GRID_TARGET_TICKS)
  const tickCount = Math.ceil(maxHours / step)
  const axisMax = step * tickCount
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => i * step)

  const bars = data.map((d, i) => {
    const h = d.hours > 0 ? Math.max(4, (d.hours / axisMax) * usableH) : 2
    const x = PAD_LEFT + GAP + i * (barW + GAP)
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
              {formatTick(tick)}
            </text>
          </g>
        )
      })}
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
