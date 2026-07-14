"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function AddSkillForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [targetHours, setTargetHours] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          targetHours: targetHours.trim() === "" ? null : targetHours,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? "Could not add skill.")
        return
      }

      setName("")
      setTargetHours("")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const addDisabled = submitting || name.trim() === ""

  return (
    <div className="rounded-[22px] border border-dashed border-[#241A14]/14 bg-white px-5 py-4.5">
      <p className="m-0 mb-3 font-[family-name:var(--font-sora)] text-[15px] font-bold">
        Add a skill
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2.5">
        <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
          <label htmlFor="skill-name" className="text-xs font-bold text-[#8A7B6C]">
            Name
          </label>
          <input
            id="skill-name"
            placeholder="e.g. Guitar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-xl border-2 border-[#241A14]/10 px-3 py-2.5 font-[family-name:var(--font-manrope)] text-sm outline-none"
          />
        </div>
        <div className="flex w-[140px] flex-col gap-1.5">
          <label htmlFor="skill-target" className="text-xs font-bold text-[#8A7B6C]">
            Target hours
          </label>
          <input
            id="skill-target"
            type="number"
            min={1}
            placeholder="optional"
            value={targetHours}
            onChange={(e) => setTargetHours(e.target.value)}
            className="rounded-xl border-2 border-[#241A14]/10 px-3 py-2.5 font-[family-name:var(--font-manrope)] text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={addDisabled}
          className="rounded-full px-5.5 py-2.75 text-[13.5px] font-extrabold text-white disabled:cursor-not-allowed"
          style={{
            background: addDisabled ? "#D8CDBE" : "linear-gradient(135deg,#FF9142,#EF2D46)",
          }}
        >
          {submitting ? "Adding..." : "Add skill"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-[#E03B3B]">{error}</p>}
    </div>
  )
}
