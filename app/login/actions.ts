"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { syncUserRecord } from "@/lib/supabase/sync-user"

export type AuthFormState = {
  error?: string
  message?: string
}

function getTimezone(formData: FormData): string {
  const tz = formData.get("timezone")
  return typeof tz === "string" && tz.length > 0 ? tz : "UTC"
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const timezone = getTimezone(formData)

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    await syncUserRecord(data.user.id, data.user.email ?? email, timezone)
  }

  redirect("/dashboard")
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const timezone = getTimezone(formData)

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user && data.session) {
    // Email confirmation is disabled — user is signed in immediately.
    await syncUserRecord(data.user.id, data.user.email ?? email, timezone)
    redirect("/dashboard")
  }

  // Email confirmation is required before a session exists.
  return {
    message: "Check your email to confirm your account, then log in.",
  }
}

export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")

  if (!email) {
    return { error: "Email is required." }
  }

  const supabase = await createClient()
  const origin = (await headers()).get("origin")

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm`,
  })

  // Always show the same message whether or not the email is registered —
  // confirming/denying an account's existence here would leak which emails
  // have accounts.
  return {
    message:
      "If an account exists for this email, we've sent a reset link.",
  }
}

export async function signInWithGoogle(formData: FormData) {
  const timezone = getTimezone(formData)
  const supabase = await createClient()
  const origin = (await headers()).get("origin")

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?tz=${encodeURIComponent(timezone)}`,
    },
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  if (data?.url) {
    redirect(data.url)
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
