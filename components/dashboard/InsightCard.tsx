const DEFAULT_MESSAGE =
  "Complete a few more sessions and check back here for personalized insights."

interface InsightCardProps {
  message?: string
}

export function InsightCard({ message = DEFAULT_MESSAGE }: InsightCardProps) {
  return (
    <div className="flex items-start gap-3.5 rounded-3xl border border-[#DCD3FF] bg-[linear-gradient(135deg,#F4F0FF,#EDE7FF)] p-5.5">
      <span className="text-[22px]">✨</span>
      <div>
        <p className="m-0 mb-1.5 font-[family-name:var(--font-sora)] text-[15px] font-bold text-[#4A3B8F]">
          This Week&apos;s Insight
        </p>
        <p className="m-0 text-[13.5px] leading-relaxed text-[#5B4E96]">{message}</p>
      </div>
    </div>
  )
}
