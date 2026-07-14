import { Skeleton } from "@/components/ui/skeleton"

export default function SessionLoading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#FBF5EC] px-4">
      <Skeleton className="h-80 w-full max-w-sm" />
    </div>
  )
}
