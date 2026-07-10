interface SkillProgressBarProps {
  minutesLogged: number
  targetHours: number | null
}

const BAR_COLOR = "#2a78d6"

export function SkillProgressBar({ minutesLogged, targetHours }: SkillProgressBarProps) {
  const hoursLogged = minutesLogged / 60

  if (targetHours === null || targetHours <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {hoursLogged.toFixed(1)} hours logged
      </p>
    )
  }

  const percent = Math.min(100, Math.round((hoursLogged / targetHours) * 100))

  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${percent}%`, backgroundColor: BAR_COLOR }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {hoursLogged.toFixed(1)} / {targetHours}h ({percent}%)
      </p>
    </div>
  )
}
