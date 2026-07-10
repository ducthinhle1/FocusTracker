"use client"

import { useEffect, useState } from "react"

import { InsightCard } from "@/components/dashboard/InsightCard"

const DEFAULT_MESSAGE =
  "Complete a few more sessions and check back here for personalized insights."
const LOADING_MESSAGE = "Loading this week's insight..."

export function WeeklyInsightCard() {
  const [message, setMessage] = useState(LOADING_MESSAGE)

  useEffect(() => {
    let cancelled = false
    fetch("/api/insights?type=weekly")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setMessage(data?.content ?? DEFAULT_MESSAGE)
      })
      .catch(() => {
        if (!cancelled) setMessage(DEFAULT_MESSAGE)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <InsightCard message={message} />
}
