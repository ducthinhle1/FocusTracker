# FocusStreak 🔥

A gamified focus-session tracker that helps you build a real attention habit — not just another Pomodoro timer.

**[Live Demo]([https://focus-tracker.vercel.app](https://focus-tracker-green-five.vercel.app/login))** 

---

## Why I built this

Most focus/productivity apps just count time. FocusStreak is built around a simple idea: **the moment you're tempted to quit is the moment that matters most.** Instead of a plain "Stop" button, ending a session early takes you through a short, honest friction flow — you're shown exactly what you'll lose (streak, achievements) and asked to confirm with a deliberate hold-to-confirm gesture, not a single accidental tap. It's a small mechanic, but it's the one thing that makes this app different from a generic timer.

## Features

- **Session tracking** — pick a skill (or skip), pick a duration, focus. Distraction detection runs automatically via the browser's Page Visibility API (debounced, so a stray notification doesn't count against you).
- **Stop-friction flow** — leaving a session early shows what you'd lose, then requires a 2.5s hold-to-confirm — a deliberate commitment device, not a punishment.
- **Streaks & 18 achievements** — day-streak tracking (timezone-aware), plus achievements spanning milestones, skill mastery, variety, comebacks after a missed day, and one tied directly to resisting the urge to quit mid-session.
- **Skills** — tag sessions to a skill you're building (e.g. "AWS Certification"), track hours against an optional target goal.
- **AI-generated feedback** — short, specific encouragement after each session and a weekly pattern-insight on the dashboard, powered by the Claude API (Haiku), cached and rate-limited to keep costs predictable.
- **Full history** — filterable, paginated session log.
- **Mobile-friendly** — every screen works down to phone width, including touch-sized controls for the hold-to-confirm interaction.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Database | Postgres via Supabase |
| ORM | Prisma |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Charts | Custom SVG (bar-grow / line-draw animations) |
| AI | Anthropic API (Claude Haiku) |
| Deploy | Vercel |

## A few engineering decisions worth mentioning

- **Server-authoritative timing** — session duration is always calculated server-side from stored `startedAt`/`endedAt` timestamps, never trusted from the client. This prevents someone from editing devtools to fake a longer session and unlock achievements they didn't earn.
- **Timezone-correct streaks** — day boundaries for streak calculations use the user's own timezone (captured at signup), not server UTC, so "missing a day" means the same thing regardless of where the server happens to be.
- **Session persistence across refresh** — a session row is created the moment you hit Start, so refreshing mid-session resumes the timer instead of losing progress.
- **Graceful AI degradation** — if the Claude API key is missing, the call fails, or the model refuses, the app falls back to a friendly static message instead of breaking. AI features are additive, never a single point of failure.
- **Cached, rate-limited AI calls** — insights are cached (by session, and on a 7-day rolling window for weekly summaries) and capped per user per day, so cost stays predictable regardless of usage patterns.

## Local development

```bash
git clone https://github.com/ducthinhle1/FocusTracker.git
cd FocusTracker/focus-tracker
npm install
cp .env.example .env.local   # fill in your own Supabase + Anthropic keys
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Required environment variables (see `.env.example`):
```
DATABASE_URL              # Supabase pooled connection string
DIRECT_URL                # Supabase direct connection (for Prisma migrations)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
```

## What's next

- Streak-freeze / grace-day mechanic (currently a deliberate hard-reset design — could be softened)
- Browser extension for actual cross-app distraction blocking (the current web-app version can only detect leaving the browser tab)
- Notification/badge dot for unviewed achievement unlocks
