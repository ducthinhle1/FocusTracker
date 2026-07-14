import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { ResetPasswordForm } from "./ResetPasswordForm"

function BrandHeader() {
  return (
    <div className="mb-7 text-center">
      <div className="mb-3.5 inline-flex size-16 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#FF9142,#EF2D46)] shadow-[0_16px_32px_-14px_rgba(239,45,70,0.5)]">
        <span className="animate-fs-flame-flicker inline-block text-3xl">🔥</span>
      </div>
      <h1 className="m-0 mb-1.5 font-[family-name:var(--font-sora)] text-2xl font-extrabold text-[#241A14]">
        Focus
        <span className="bg-[linear-gradient(135deg,#FF9142,#EF2D46)] bg-clip-text text-transparent">
          Streak
        </span>
      </h1>
      <p className="m-0 text-[13.5px] text-[#8A7B6C]">
        Build your focus habit, one session at a time.
      </p>
    </div>
  )
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF5EC] px-6">
      <div className="w-full max-w-[400px] animate-fs-fade-up">
        <BrandHeader />
        <div className="rounded-[26px] border border-[#241A14]/[0.06] bg-white px-[26px] py-7 shadow-[0_20px_44px_-24px_rgba(36,26,20,0.2)]">
          {user ? (
            <>
              <h2 className="m-0 mb-1.5 font-[family-name:var(--font-sora)] text-lg font-extrabold text-[#241A14]">
                Set a new password
              </h2>
              <p className="m-0 mb-4.5 text-[13px] leading-relaxed text-[#8A7B6C]">
                Choose a new password for{" "}
                <strong className="text-[#241A14]">{user.email}</strong>.
              </p>
              <ResetPasswordForm />
            </>
          ) : (
            <div className="text-center">
              <h2 className="m-0 mb-1.5 font-[family-name:var(--font-sora)] text-lg font-extrabold text-[#241A14]">
                Set a new password
              </h2>
              <p className="m-0 mb-4.5 text-[13px] leading-relaxed text-[#8A7B6C]">
                We couldn&apos;t verify your reset link.
              </p>
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#F6C9C9] bg-[#FDEEEE] px-3.5 py-2.5 text-left">
                <span className="shrink-0 text-sm">⚠️</span>
                <p className="m-0 text-[12.5px] leading-relaxed text-[#B43A3A]">
                  {error ??
                    "This password reset link is invalid or has expired. Please request a new one."}
                </p>
              </div>
              <Link
                href="/login"
                className="block w-full rounded-xl border-[1.5px] border-[#241A14]/12 bg-white py-3 text-sm font-bold text-[#241A14]"
              >
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
