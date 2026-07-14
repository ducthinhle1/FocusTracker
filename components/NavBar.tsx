"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const TABS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    icon: "🏠",
  },
  {
    href: "/session",
    label: "Start Session",
    shortLabel: "Session",
    icon: "⏱️",
  },
  { href: "/skills", label: "Skills", shortLabel: "Skills", icon: "🧩" },
  { href: "/history", label: "History", shortLabel: "History", icon: "📜" },
  {
    href: "/achievements",
    label: "Achievements",
    shortLabel: "Awards",
    icon: "🏆",
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
      {/* Desktop / tablet: horizontal pill tabs in the shared header. */}
      <nav className="hidden items-center gap-1 font-[family-name:var(--font-manrope)] sm:flex">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href)
          const showBadge = tab.href === "/achievements" && hasUnviewedAchievements

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-bold transition-colors",
                active ? "bg-[#241A14] text-white" : "text-[#8A7B6C] hover:bg-[#241A14]/5"
              )}
            >
              <span className="text-[15px]">{tab.icon}</span>
              {/* Icon-only at tablet widths to keep the header from
                  overflowing with 5 tabs + logo + clock; full label once
                  there's room at lg+. */}
              <span className="hidden lg:inline">{tab.label}</span>
              {showBadge && (
                <span
                  aria-label="New achievement"
                  className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#EF2D46] ring-2 ring-[#FBF5EC]"
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Mobile: fixed bottom tab bar (gamified apps favor a persistent bar
          with icon+label over a hamburger — it keeps every destination one
          tap away). */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[#241A14]/8 bg-white/97 py-2 pb-2.5 backdrop-blur-sm sm:hidden">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href)
          const showBadge = tab.href === "/achievements" && hasUnviewedAchievements

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-md p-1 font-[family-name:var(--font-manrope)] text-[10px] font-bold transition-colors",
                active ? "text-[#EF2D46]" : "text-[#B7A996]"
              )}
            >
              <span className="text-[19px]">{tab.icon}</span>
              {tab.shortLabel}
              {showBadge && (
                <span
                  aria-label="New achievement"
                  className="absolute top-0.5 right-[22%] size-2.5 rounded-full bg-[#EF2D46] ring-2 ring-white"
                />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
