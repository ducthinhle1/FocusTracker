import { Skeleton } from "@/components/ui/skeleton"

export default function SkillsLoading() {
  return (
    <div className="flex-1 bg-background px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>

        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}
