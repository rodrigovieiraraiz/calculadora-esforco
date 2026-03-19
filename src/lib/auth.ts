import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export interface SessionData {
  userId: string
  email: string
  nome: string
  role: string
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  if (!sessionId) return null

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true, email: true, nome: true, role: true, ativo: true } } },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
    return null
  }
  if (!session.user.ativo) return null

  return {
    userId: session.user.id,
    email: session.user.email,
    nome: session.user.nome,
    role: session.user.role,
  }
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession()
  if (!session) {
    throw new AuthError('Não autenticado', 401)
  }
  return session
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth()
  if (session.role !== 'ADMIN') {
    throw new AuthError('Acesso restrito a administradores', 403)
  }
  return session
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}
