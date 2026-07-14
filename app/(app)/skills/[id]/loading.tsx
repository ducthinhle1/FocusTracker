import { Skeleton } from "@/components/ui/skeleton"

export default function SkillDetailLoading() {
  return (
    <div className="flex-1 bg-[#FBF5EC] px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-40" />
        </div>

        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-9 w-44" />
      </div>
    </div>
  )
}
