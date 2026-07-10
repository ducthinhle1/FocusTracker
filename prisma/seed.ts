import { config } from "dotenv"
import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { ACHIEVEMENT_DEFINITIONS } from "../lib/achievement-definitions"

config({ path: ".env.local" })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      create: achievement,
      update: {},
    })
  }
  console.log(`Seeded ${ACHIEVEMENT_DEFINITIONS.length} achievements.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
