interface SkillProgressBarProps {
  minutesLogged: number
  targetHours: number | null
  color: string
}

export function SkillProgressBar({ minutesLogged, targetHours, color }: SkillProgressBarProps) {
  const hoursLogged = minutesLogged / 60

  if (targetHours === null || targetHours <= 0) {
    return (
      <p className="m-0 text-[12.5px] font-semibold text-[#8A7B6C]">
        {hoursLogged.toFixed(1)}h logged · no goal set
      </p>
    )
  }

  const percent = Math.min(100, Math.round((hoursLogged / targetHours) * 100))

  return (
    <div>
      <div
        className="h-[9px] w-full overflow-hidden rounded-full bg-[#241A14]/[0.07]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <p className="m-0 mt-1.5 text-xs font-semibold text-[#8A7B6C]">
        {hoursLogged.toFixed(1)}h · {percent}% to goal
      </p>
    </div>
  )
}
