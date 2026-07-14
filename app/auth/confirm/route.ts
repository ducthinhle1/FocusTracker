import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

// Handles the redirect back from Supabase after a password-recovery email
// link is clicked. Exchanges the recovery code for a session (this must
// happen in a Route Handler, not a Server Component, since only Route
// Handlers and Server Actions can persist the resulting session cookie),
// then sends the user on to set their new password.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}/reset-password`)
    }
  }

  return NextResponse.redirect(
    `${origin}/reset-password?error=${encodeURIComponent(
      "This password reset link is invalid or has expired. Please request a new one."
    )}`
  )
}
