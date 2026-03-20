import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

/**
 * Roles do sistema:
 * - ADMIN    → acesso total, incluindo /admin (gestão de usuários, auditoria)
 * - OPERATOR → acesso a todas as rotas EXCETO /admin
 * - VIEWER   → acesso somente leitura (Dashboard e Backlog)
 */
export const ROLES = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

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

/** Permite apenas ADMIN. Usar em rotas /admin/* */
export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth()
  if (session.role !== ROLES.ADMIN) {
    throw new AuthError('Acesso restrito a administradores', 403)
  }
  return session
}

/** Permite ADMIN e OPERATOR. Usar em rotas de operação/parametrização. */
export async function requireOperator(): Promise<SessionData> {
  const session = await requireAuth()
  if (session.role !== ROLES.ADMIN && session.role !== ROLES.OPERATOR) {
    throw new AuthError('Acesso restrito a operadores', 403)
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
