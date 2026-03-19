import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin, AuthError } from '@/lib/auth'
import { logAudit } from '@/lib/services/audit'

export async function GET() {
  try {
    const session = await requireAdmin()

    const users = await prisma.user.findMany({
      select: { id: true, email: true, nome: true, role: true, ativo: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[GET /api/admin/usuarios]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { email, nome, senha, role } = body

    if (!email || !nome || !senha) {
      return NextResponse.json({ error: 'Email, nome e senha são obrigatórios' }, { status: 400 })
    }

    if (role && !['ADMIN', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: 'Role inválido. Use ADMIN ou VIEWER' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 })
    }

    const hash = await bcrypt.hash(senha, 10)
    const user = await prisma.user.create({
      data: { email, nome, senha: hash, role: role || 'VIEWER' },
      select: { id: true, email: true, nome: true, role: true, ativo: true, createdAt: true },
    })

    await logAudit({
      entidade: 'User',
      entidadeId: user.id,
      acao: 'CREATE',
      dadosNovos: { email: user.email, nome: user.nome, role: user.role },
      usuario: session.email,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/admin/usuarios]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
