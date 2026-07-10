import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { syncUserRecord } from "@/lib/supabase/sync-user"

// Handles the redirect back from Supabase after an OAuth (e.g. Google)
// sign-in. Exchanges the auth code for a session and makes sure a
// matching Prisma User row exists before sending the user on.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const timezone = searchParams.get("tz") ?? "UTC"
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      await syncUserRecord(
        data.user.id,
        data.user.email ?? "",
        timezone
      )
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not authenticate. Please try again.")}`
  )
}
