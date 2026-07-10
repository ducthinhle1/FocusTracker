"use client"

import { Suspense, useActionState, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { login, signup, signInWithGoogle, type AuthFormState } from "./actions"

const initialState: AuthFormState = {}

function LoginForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  const [mode, setMode] = useState<"login" | "signup">("login")
  const [timezone, setTimezone] = useState("UTC")

  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState
  )
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
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

  const state = mode === "login" ? loginState : signupState
  const action = mode === "login" ? loginAction : signupAction
  const pending = mode === "login" ? loginPending : signupPending

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {mode === "login" ? "Log in to FocusStreak" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Enter your email and password to continue."
              : "Sign up with your email and a password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="timezone" value={timezone} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </div>

            {(state?.error || urlError) && (
              <p className="text-sm text-destructive">
                {state?.error ?? urlError}
              </p>
            )}
            {state?.message && (
              <p className="text-sm text-muted-foreground">{state.message}</p>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {pending
                ? "Please wait..."
                : mode === "login"
                  ? "Log in"
                  : "Sign up"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <form action={signInWithGoogle}>
            <input type="hidden" name="timezone" value={timezone} />
            <Button type="submit" variant="outline" className="w-full">
              Continue with Google
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {mode === "login"
              ? "Don't have an account? Sign up"
              : "Already have an account? Log in"}
          </button>
        </CardFooter>
      </Card>
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
