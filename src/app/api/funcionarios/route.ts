import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, requireOperator, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    const funcionarios = await prisma.funcionario.findMany({
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(funcionarios)
  } catch (error) {
    console.error('[GET /api/funcionarios]', error)
    return NextResponse.json({ error: 'Erro ao listar funcionários' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { nome, cargo } = body

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const funcionario = await prisma.funcionario.create({
      data: {
        nome: nome.trim(),
        cargo: cargo?.trim() || null,
      },
    })

    return NextResponse.json(funcionario, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/funcionarios]', error)
    return NextResponse.json({ error: 'Erro ao criar funcionário' }, { status: 500 })
  }
}
