"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center bg-[#FBF5EC] px-4 py-16">
      <div className="w-full max-w-sm animate-fs-fade-up rounded-[26px] border border-[#241A14]/[0.06] bg-white px-[26px] py-7 text-center shadow-[0_20px_44px_-24px_rgba(36,26,20,0.2)]">
        <div className="mb-3.5 inline-flex size-14 items-center justify-center rounded-full bg-[#FDEEEE]">
          <span className="text-2xl">😕</span>
        </div>
        <h1 className="m-0 mb-1.5 font-[family-name:var(--font-sora)] text-lg font-extrabold text-[#241A14]">
          Something went wrong
        </h1>
        <p className="m-0 mb-5.5 text-[13.5px] leading-relaxed text-[#8A7B6C]">
          An unexpected error occurred. You can try again, or head back to
          your dashboard.
        </p>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-full bg-[linear-gradient(135deg,#FF9142,#EF2D46)] py-3 text-[13.5px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(239,45,70,0.5)]"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="flex-1 rounded-full border-[1.5px] border-[#241A14]/12 bg-white py-3 text-center text-[13.5px] font-extrabold text-[#241A14]"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
