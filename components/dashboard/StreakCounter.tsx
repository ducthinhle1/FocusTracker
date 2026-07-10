import { Flame } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

interface StreakCounterProps {
  currentStreak: number
  longestStreak: number
}

export function StreakCounter({ currentStreak, longestStreak }: StreakCounterProps) {
  return (
    <Card className="w-full overflow-hidden border-none bg-gradient-to-br from-[#eb6834] to-[#e34948] text-white shadow-lg dark:from-[#d95926] dark:to-[#e66767]">
      <CardContent className="flex flex-col items-center gap-1 py-8 text-center">
        <div className="flex items-center gap-2">
          <Flame
            className="size-10 fill-yellow-300 text-yellow-300 drop-shadow-sm"
            strokeWidth={1.5}
          />
          <span className="text-6xl leading-none font-bold">{currentStreak}</span>
        </div>
        <p className="text-sm font-medium tracking-wide text-orange-50 uppercase">
          {currentStreak === 1 ? "Day" : "Days"} streak
        </p>
        <p className="mt-3 text-xs text-orange-100">
          Longest streak: <span className="font-semibold">{longestStreak}</span>{" "}
          {longestStreak === 1 ? "day" : "days"}
        </p>
      </CardContent>
    </Card>
  )
}
