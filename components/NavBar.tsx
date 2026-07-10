"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Timer,
  ListChecks,
  History,
  Trophy,
} from "lucide-react"

import { cn } from "@/lib/utils"

const TABS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    icon: LayoutDashboard,
  },
  {
    href: "/session",
    label: "Start Session",
    shortLabel: "Session",
    icon: Timer,
  },
  { href: "/skills", label: "Skills", shortLabel: "Skills", icon: ListChecks },
  { href: "/history", label: "History", shortLabel: "History", icon: History },
  {
    href: "/achievements",
    label: "Achievements",
    shortLabel: "Awards",
    icon: Trophy,
  },
] as const

interface NavBarProps {
  hasUnviewedAchievements: boolean
}

function isTabActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavBar({ hasUnviewedAchievements }: NavBarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop / tablet: horizontal tabs in the shared header. */}
      <nav className="hidden items-center gap-1 sm:flex">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href)
          const showBadge = tab.href === "/achievements" && hasUnviewedAchievements

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <tab.icon className="size-4" />
              {/* Icon-only at tablet widths to keep the header from
                  overflowing with 5 tabs + logo + clock; full label once
                  there's room at lg+. */}
              <span className="hidden lg:inline">{tab.label}</span>
              {showBadge && (
                <span
                  aria-label="New achievement"
                  className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-background"
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Mobile: fixed bottom tab bar (gamified apps favor a persistent bar
          with icon+label over a hamburger — it keeps every destination one
          tap away). */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-background/95 py-1.5 backdrop-blur-sm sm:hidden">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href)
          const showBadge = tab.href === "/achievements" && hasUnviewedAchievements

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className="size-5" />
              {tab.shortLabel}
              {showBadge && (
                <span
                  aria-label="New achievement"
                  className="absolute top-0.5 right-[22%] size-2.5 rounded-full bg-destructive ring-2 ring-background"
                />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
