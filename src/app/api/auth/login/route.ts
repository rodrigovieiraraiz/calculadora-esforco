import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, senha } = body

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.ativo || !user.senha) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const valid = await bcrypt.compare(senha, user.senha)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // Create session (7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt },
    })

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, nome: user.nome, role: user.role },
    })

    response.cookies.set('session_id', session.id, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      expires: expiresAt,
    })

    return response
  } catch (error) {
    console.error('[POST /api/auth/login]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
