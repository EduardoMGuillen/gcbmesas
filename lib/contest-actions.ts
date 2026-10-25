'use server'

import { prisma } from './prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') throw new Error('Solo administradores')
}

export async function getHalloweenContestants() {
  await requireAdminSession()
  return prisma.halloweenContestant.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function deleteHalloweenContestant(id: string) {
  await requireAdminSession()
  await prisma.halloweenContestant.delete({ where: { id } })
  revalidatePath('/admin/concursos')
}
