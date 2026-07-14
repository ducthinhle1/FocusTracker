"use client"

import { useEffect, useState } from "react"

interface LocalDateTimeProps {
  /** ISO timestamp string — always UTC in the database, formatted here using
   * the browser's own local timezone (same source of truth as LiveClock),
   * never a timezone stored on the server. */
  iso: string
  options: Intl.DateTimeFormatOptions
}

export function LocalDateTime({ iso, options }: LocalDateTimeProps) {
  // Starts null so the server-rendered markup and the client's first paint
  // match exactly (the server has no meaningful "browser local timezone");
  // the real value fills in a moment after mount, in the effect below —
  // same pattern as LiveClock.
  const [formatted, setFormatted] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormatted(new Intl.DateTimeFormat("en-US", options).format(new Date(iso)))
  }, [iso, options])

  return formatted ?? null
}
