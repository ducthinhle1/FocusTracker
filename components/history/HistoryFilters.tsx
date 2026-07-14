"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

interface HistoryFiltersProps {
  skills: { id: string; name: string }[]
}

const SELECT_CLASS =
  "rounded-[10px] border border-[#241A14]/12 bg-white px-3 py-2.5 font-[family-name:var(--font-manrope)] text-[13px] text-[#241A14] outline-none"

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
    <>
      <select
        aria-label="Filter by skill"
        className={SELECT_CLASS}
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
      </select>

      <select
        aria-label="Filter by status"
        className={SELECT_CLASS}
        value={searchParams.get("status") ?? "all"}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="all">All statuses</option>
        <option value="completed">Completed</option>
        <option value="stopped">Stopped early</option>
      </select>
    </>
  )
}
