import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, AuthError } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const funcionario = await prisma.funcionario.findUnique({ where: { id } })
    if (!funcionario) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }
    return NextResponse.json(funcionario)
  } catch (error) {
    console.error('[GET /api/funcionarios/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar funcionário' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { nome, cargo, ativo } = body

    if (nome !== undefined && !nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (nome !== undefined) data.nome = nome.trim()
    if (cargo !== undefined) data.cargo = cargo?.trim() || null
    if (ativo !== undefined) data.ativo = ativo

    const funcionario = await prisma.funcionario.update({
      where: { id },
      data,
    })

    return NextResponse.json(funcionario)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/funcionarios/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar funcionário' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params

    await prisma.funcionario.delete({ where: { id } })

    return NextResponse.json({ message: 'Funcionário excluído com sucesso' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/funcionarios/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir funcionário' }, { status: 500 })
  }
}
