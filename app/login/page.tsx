"use client"

import { Suspense, useActionState, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import {
  login,
  signup,
  signInWithGoogle,
  requestPasswordReset,
  type AuthFormState,
} from "./actions"

const initialState: AuthFormState = {}

const FIELD_CLASS =
  "rounded-xl border-[1.5px] border-[#241A14]/12 px-3.5 py-3 text-[14.5px] outline-none transition-colors focus:border-[#FF5A3C] focus:shadow-[0_0_0_3px_rgba(255,90,60,0.12)]"

function Spinner() {
  return (
    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="animate-fs-shake mb-4 flex items-start gap-2 rounded-xl border border-[#F6C9C9] bg-[#FDEEEE] px-3.5 py-2.5">
      <span className="shrink-0 text-sm">⚠️</span>
      <p className="m-0 text-[12.5px] leading-relaxed text-[#B43A3A]">{message}</p>
    </div>
  )
}

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

function LoginForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login")
  const [timezone, setTimezone] = useState("UTC")
  const [forgotEmail, setForgotEmail] = useState("")

  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState
  )
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    initialState
  )
  const [forgotState, forgotAction, forgotPending] = useActionState(
    requestPasswordReset,
    initialState
  )

  useEffect(() => {
    // Browser-only API: must run after mount to avoid an SSR/client
    // hydration mismatch (the server has no meaningful "browser timezone").
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setTimezone("UTC")
    }
  }, [])

  function switchMode(next: "login" | "signup") {
    setMode(next)
  }

  const forgotSent = mode === "forgot" && !!forgotState?.message

  let cardContent: React.ReactNode

  if (mode === "forgot" && forgotSent) {
    cardContent = (
      <div className="py-1.5 text-center">
        <div className="mb-3.5 inline-flex size-[52px] items-center justify-center rounded-full bg-[#EAF7F0]">
          <span className="text-2xl">📬</span>
        </div>
        <h2 className="m-0 mb-2 font-[family-name:var(--font-sora)] text-[17px] font-extrabold text-[#241A14]">
          Check your inbox
        </h2>
        <p className="m-0 mb-5 text-[13px] leading-relaxed text-[#8A7B6C]">
          If an account exists for{" "}
          <strong className="text-[#241A14]">{forgotEmail}</strong>, we&apos;ve
          sent a link to reset your password.
        </p>
        <button
          type="button"
          onClick={() => setMode("login")}
          className="w-full rounded-xl border-[1.5px] border-[#241A14]/12 bg-white py-3 text-sm font-bold text-[#241A14]"
        >
          Back to sign in
        </button>
      </div>
    )
  } else if (mode === "forgot") {
    cardContent = (
      <>
        <button
          type="button"
          onClick={() => setMode("login")}
          className="mb-4 border-none bg-transparent p-0 text-[13px] font-bold text-[#8A7B6C]"
        >
          ← Back to sign in
        </button>
        <h2 className="m-0 mb-1.5 font-[family-name:var(--font-sora)] text-lg font-extrabold text-[#241A14]">
          Reset your password
        </h2>
        <p className="m-0 mb-4.5 text-[13px] leading-relaxed text-[#8A7B6C]">
          Enter your email and we&apos;ll send you a link to get back in.
        </p>

        {forgotState?.error && <ErrorBanner message={forgotState.error} />}

        <form action={forgotAction} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="forgot-email"
              className="text-[12.5px] font-bold text-[#6B5E4F]"
            >
              Email
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <button
            type="submit"
            disabled={forgotPending || !forgotEmail}
            className="mt-0.5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14.5px] font-extrabold text-white disabled:cursor-not-allowed"
            style={{
              background:
                forgotPending || !forgotEmail
                  ? "#E9BBAE"
                  : "linear-gradient(135deg,#FF9142,#EF2D46)",
              boxShadow:
                forgotPending || !forgotEmail
                  ? "none"
                  : "0 12px 24px -12px rgba(239,45,70,0.5)",
            }}
          >
            {forgotPending && <Spinner />}
            <span>{forgotPending ? "Sending..." : "Send reset link"}</span>
          </button>
        </form>
      </>
    )
  } else {
    const state = mode === "login" ? loginState : signupState
    const action = mode === "login" ? loginAction : signupAction
    const pending = mode === "login" ? loginPending : signupPending
    const isLogin = mode === "login"

    cardContent = (
      <>
        <div className="mb-5.5 flex gap-1 rounded-[14px] bg-[#F1ECE3] p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="flex-1 rounded-[10px] py-2.25 text-[13.5px] font-bold transition-colors"
            style={
              isLogin
                ? { background: "#fff", color: "#241A14", boxShadow: "0 1px 4px rgba(36,26,20,0.1)" }
                : { background: "transparent", color: "#8A7B6C" }
            }
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className="flex-1 rounded-[10px] py-2.25 text-[13.5px] font-bold transition-colors"
            style={
              !isLogin
                ? { background: "#fff", color: "#241A14", boxShadow: "0 1px 4px rgba(36,26,20,0.1)" }
                : { background: "transparent", color: "#8A7B6C" }
            }
          >
            Sign Up
          </button>
        </div>

        {(state?.error || urlError) && (
          <ErrorBanner message={state?.error ?? urlError!} />
        )}
        {state?.message && (
          <p className="mb-4 text-[12.5px] text-[#8A7B6C]">{state.message}</p>
        )}

        <form action={action} className="flex flex-col gap-3.5">
          <input type="hidden" name="timezone" value={timezone} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[12.5px] font-bold text-[#6B5E4F]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-[12.5px] font-bold text-[#6B5E4F]">
                Password
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="border-none bg-transparent p-0 text-xs font-bold text-[#EF2D46]"
                >
                  Forgot?
                </button>
              )}
            </div>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={isLogin ? "Your password" : "At least 6 characters"}
              required
              minLength={6}
              autoComplete={isLogin ? "current-password" : "new-password"}
              className={FIELD_CLASS}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-0.5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14.5px] font-extrabold text-white disabled:cursor-not-allowed"
            style={{
              background: pending ? "#E9BBAE" : "linear-gradient(135deg,#FF9142,#EF2D46)",
              boxShadow: pending ? "none" : "0 12px 24px -12px rgba(239,45,70,0.5)",
            }}
          >
            {pending && <Spinner />}
            <span>{pending ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}</span>
          </button>
        </form>

        <div className="my-5 flex items-center gap-2.5">
          <div className="h-px flex-1 bg-[#241A14]/8" />
          <span className="text-[11.5px] font-bold text-[#B7A996]">OR</span>
          <div className="h-px flex-1 bg-[#241A14]/8" />
        </div>

        <form action={signInWithGoogle}>
          <input type="hidden" name="timezone" value={timezone} />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-[#241A14]/12 bg-white py-3 text-sm font-bold text-[#241A14]"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>
        </form>

        <p className="m-0 mt-5 text-center text-[12.5px] text-[#8A7B6C]">
          {isLogin ? "New to FocusStreak?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(isLogin ? "signup" : "login")}
            className="border-none bg-transparent p-0 text-[12.5px] font-bold text-[#EF2D46] underline-offset-2 hover:underline"
          >
            {isLogin ? "Create an account" : "Sign in"}
          </button>
        </p>
      </>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF5EC] px-6">
      <div className="w-full max-w-[400px] animate-fs-fade-up">
        <BrandHeader />
        <div className="rounded-[26px] border border-[#241A14]/[0.06] bg-white px-[26px] py-7 shadow-[0_20px_44px_-24px_rgba(36,26,20,0.2)]">
          {cardContent}
        </div>
        <p className="m-0 mt-4.5 text-center text-[11.5px] text-[#C7BBA9]">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
