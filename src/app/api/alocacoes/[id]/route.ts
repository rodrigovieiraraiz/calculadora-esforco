import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const alocacao = await prisma.alocacao.findUnique({
      where: { id },
      include: {
        funcionario: { select: { id: true, nome: true, cargo: true } },
        backlogItem: {
          select: {
            id: true,
            solicitacao: {
              select: {
                titulo: true,
                areaSolicitante: true,
                area: { select: { nome: true } },
              },
            },
          },
        },
      },
    })
    if (!alocacao) {
      return NextResponse.json({ error: 'Alocação não encontrada' }, { status: 404 })
    }
    return NextResponse.json(alocacao)
  } catch (error) {
    console.error('[GET /api/alocacoes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar alocação' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireOperator()
    const { id } = await params
    const body = await request.json()
    const { funcionarioId, backlogItemId, titulo, dataInicio, dataFim, areaSolicitante, cor } = body

    const data: Record<string, unknown> = {}
    if (funcionarioId !== undefined) data.funcionarioId = funcionarioId
    if (backlogItemId !== undefined) data.backlogItemId = backlogItemId || null
    if (titulo !== undefined) data.titulo = titulo.trim()
    if (dataInicio !== undefined) data.dataInicio = new Date(dataInicio)
    if (dataFim !== undefined) data.dataFim = new Date(dataFim)
    if (areaSolicitante !== undefined) data.areaSolicitante = areaSolicitante?.trim() || null
    if (cor !== undefined) data.cor = cor?.trim() || null

    const alocacao = await prisma.alocacao.update({
      where: { id },
      data,
      include: {
        funcionario: { select: { id: true, nome: true, cargo: true } },
      },
    })

    return NextResponse.json(alocacao)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/alocacoes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar alocação' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireOperator()
    const { id } = await params

    await prisma.alocacao.delete({ where: { id } })

    return NextResponse.json({ message: 'Alocação excluída com sucesso' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/alocacoes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir alocação' }, { status: 500 })
  }
}
