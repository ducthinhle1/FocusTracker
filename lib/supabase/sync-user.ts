import { prisma } from "@/lib/prisma"

/**
 * Ensures a Prisma `User` row exists for a given Supabase Auth user.
 * The Prisma row's `id` is always the Supabase Auth user's id (never a
 * freshly generated id), so the two tables stay in lockstep.
 *
 * Only creates the row if it doesn't already exist — an existing user's
 * timezone is intentionally left untouched on subsequent logins.
 */
export async function syncUserRecord(
  userId: string,
  email: string,
  timezone?: string
) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })

  if (existing) {
    return existing
  }

  return prisma.user.create({
    data: {
      id: userId,
      email,
      timezone: timezone && timezone.length > 0 ? timezone : "UTC",
    },
  })
}
