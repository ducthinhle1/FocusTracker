"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

const FIELD_CLASS =
  "rounded-xl border-[1.5px] border-[#241A14]/12 px-3.5 py-3 text-[14.5px] outline-none transition-colors focus:border-[#FF5A3C] focus:shadow-[0_0_0_3px_rgba(255,90,60,0.12)]"

function Spinner() {
  return (
    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  )
}

export function ResetPasswordForm() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match. Please re-enter.")
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    router.push("/dashboard")
  }

  const submitDisabled = submitting || !newPassword || !confirmPassword

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {error && (
        <div className="animate-fs-shake flex items-start gap-2 rounded-xl border border-[#F6C9C9] bg-[#FDEEEE] px-3.5 py-2.5">
          <span className="shrink-0 text-sm">⚠️</span>
          <p className="m-0 text-[12.5px] leading-relaxed text-[#B43A3A]">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-password" className="text-[12.5px] font-bold text-[#6B5E4F]">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          placeholder="At least 6 characters"
          required
          minLength={6}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={FIELD_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-password" className="text-[12.5px] font-bold text-[#6B5E4F]">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          placeholder="Re-enter password"
          required
          minLength={6}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={FIELD_CLASS}
        />
      </div>

      <button
        type="submit"
        disabled={submitDisabled}
        className="mt-0.5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14.5px] font-extrabold text-white disabled:cursor-not-allowed"
        style={{
          background: submitDisabled ? "#E9BBAE" : "linear-gradient(135deg,#FF9142,#EF2D46)",
          boxShadow: submitDisabled ? "none" : "0 12px 24px -12px rgba(239,45,70,0.5)",
        }}
      >
        {submitting && <Spinner />}
        <span>{submitting ? "Updating..." : "Update Password"}</span>
      </button>
    </form>
  )
}
