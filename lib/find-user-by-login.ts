import { prisma } from './prisma'

export function usernameEqualsInsensitive(username: string) {
  return {
    username: {
      equals: username,
      mode: 'insensitive' as const,
    },
  }
}

/** Login: usuario sin distinguir mayúsculas/minúsculas (PostgreSQL). */
export async function findUserByUsernameInsensitive(username: string) {
  return prisma.user.findFirst({
    where: usernameEqualsInsensitive(username),
  })
}
