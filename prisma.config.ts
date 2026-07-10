import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

// Prisma 7's CLI no longer loads .env files automatically, and Next.js's
// convention is `.env.local` (not `.env`), so we load it explicitly here.
config({ path: ".env.local" })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Used only by the Prisma CLI (db push / migrate), so the direct
    // (non-transaction-pooled) connection is used here.
    url: env("DIRECT_URL"),
  },
})
