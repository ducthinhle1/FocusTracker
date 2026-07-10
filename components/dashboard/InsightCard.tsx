import { Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const DEFAULT_MESSAGE =
  "Complete a few more sessions and check back here for personalized insights."

interface InsightCardProps {
  message?: string
}

export function InsightCard({ message = DEFAULT_MESSAGE }: InsightCardProps) {
  return (
    <Card className="w-full border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-violet-500" />
          This Week&apos;s Insight
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}
