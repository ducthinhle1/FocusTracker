"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={deleting}
      onClick={handleDelete}
      aria-label={`Delete ${skillName}`}
    >
      <Trash2 className="size-4 text-muted-foreground" />
    </Button>
  )
}
