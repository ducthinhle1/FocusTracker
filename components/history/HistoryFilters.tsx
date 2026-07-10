"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Select } from "@/components/ui/select"

interface HistoryFiltersProps {
  skills: { id: string; name: string }[]
}

export function HistoryFilters({ skills }: HistoryFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    // Any filter change resets pagination back to the first page.
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        aria-label="Filter by skill"
        className="w-auto"
        value={searchParams.get("skill") ?? "all"}
        onChange={(e) => updateParam("skill", e.target.value)}
      >
        <option value="all">All skills</option>
        <option value="general">General</option>
        {skills.map((skill) => (
          <option key={skill.id} value={skill.id}>
            {skill.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Filter by status"
        className="w-auto"
        value={searchParams.get("status") ?? "all"}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="all">All statuses</option>
        <option value="completed">Completed</option>
        <option value="stopped">Stopped early</option>
      </Select>
    </div>
  )
}
