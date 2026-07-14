"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface DeleteSkillButtonProps {
  skillId: string
  skillName: string
}

export function DeleteSkillButton({ skillId, skillName }: DeleteSkillButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${skillName}"? Its sessions won't be deleted — they'll just become General sessions.`
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      await fetch(`/api/skills/${skillId}`, { method: "DELETE" })
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      disabled={deleting}
      onClick={handleDelete}
      aria-label={`Delete ${skillName}`}
      className="rounded-md p-1.5 text-[17px] text-[#D8CDBE] disabled:opacity-50"
    >
      ✕
    </button>
  )
}
