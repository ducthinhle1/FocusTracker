"use client"

interface WeeklyChartProps {
  data: { date: string; label: string; minutes: number }[]
}

const CHART_W = 340
const CHART_H = 160
const PAD_TOP = 18
const PAD_BOTTOM = 30
const PAD_LEFT = 26
const BAR_GAP = 10
const BAR_COLOR = "#2F6FED"
const EMPTY_BAR_COLOR = "#E7E1D6"
const GRID_TARGET_TICKS = 3

// Picks a "nice" round step (1/2/5/10 x a power of ten) so axis labels read
// as 0/15/30 rather than 0/23.33/46.67. `integerOnly` rounds the step up to
// a whole number, since minutes/streak-days are never fractional.
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

export function WeeklyChart({ data }: WeeklyChartProps) {
  const n = data.length
  const innerW = CHART_W - PAD_LEFT
  const barW = n > 0 ? (innerW - BAR_GAP * (n + 1)) / n : 0
  const rawMax = Math.max(60, ...data.map((d) => d.minutes))
  const usableH = CHART_H - PAD_TOP - PAD_BOTTOM

  const step = niceStep(rawMax, GRID_TARGET_TICKS, true)
  const tickCount = Math.ceil(rawMax / step)
  const axisMax = step * tickCount
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => i * step)

  const bars = data.map((d, i) => {
    const h = axisMax
      ? Math.max(d.minutes ? 6 : 3, (d.minutes / axisMax) * usableH)
      : 3
    const x = PAD_LEFT + BAR_GAP + i * (barW + BAR_GAP)
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
