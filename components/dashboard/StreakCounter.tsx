interface WeekStripDay {
  label: string
  hit: boolean
}

interface StreakCounterProps {
  currentStreak: number
  longestStreak: number
  weekStrip: WeekStripDay[]
}

export function StreakCounter({
  currentStreak,
  longestStreak,
  weekStrip,
}: StreakCounterProps) {
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#FF9142_0%,#FF5A3C_48%,#EF2D46_100%)] px-6 pt-10 pb-8 text-center text-white shadow-[0_28px_56px_-20px_rgba(239,45,70,0.45)]">
      <div
        aria-hidden
        className="animate-fs-flame-pulse absolute -top-16 -right-10 size-56 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.35),transparent_70%)]"
      />
      <div
        aria-hidden
        className="animate-fs-flame-pulse absolute -bottom-20 -left-12 size-64 rounded-full bg-[radial-gradient(circle,rgba(255,209,102,0.3),transparent_70%)]"
        style={{ animationDelay: "1s", animationDuration: "5s" }}
      />

      <div className="relative flex items-center gap-3.5">
        <span
          className="inline-block text-5xl drop-shadow-[0_6px_14px_rgba(0,0,0,0.25)]"
          style={{ animation: "fs-flame-flicker 2.2s ease-in-out infinite" }}
        >
          🔥
        </span>
        <span
          className="font-[family-name:var(--font-sora)] text-[88px] leading-none font-extrabold"
          style={{ textShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
        >
          {currentStreak}
        </span>
      </div>
      <p className="relative mt-1.5 text-sm font-bold tracking-[0.14em] text-white/92 uppercase">
        {currentStreak === 1 ? "Day" : "Day"} streak
      </p>

      <div className="relative mt-5 flex gap-1.5">
        {weekStrip.map((day, i) => (
          <div
            key={i}
            title={day.label}
            className={
              day.hit
                ? "size-2.5 rounded-full bg-white/95"
                : "size-2.5 rounded-full bg-white/28"
            }
          />
        ))}
      </div>

      <div className="relative mt-4.5 flex items-center gap-2 rounded-full bg-white/16 px-4.5 py-2">
        <span className="text-[13px] text-white/90">🏆 Longest streak</span>
        <span className="font-[family-name:var(--font-sora)] text-[15px] font-extrabold">
          {longestStreak} {longestStreak === 1 ? "day" : "days"}
        </span>
      </div>
    </div>
  )
}
