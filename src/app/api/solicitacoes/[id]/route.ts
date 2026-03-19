import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/services/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const solicitacao = await prisma.solicitacao.findUnique({
      where: { id },
      include: {
        area: { select: { id: true, nome: true } },
        criterios: {
          include: {
            criterio: { select: { id: true, nome: true } },
            complexidade: { select: { id: true, nome: true } },
            componente: { select: { id: true, nome: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        backlogItem: true,
      },
    })

    if (!solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    return NextResponse.json(solicitacao)
  } catch (error) {
    console.error('[GET /api/solicitacoes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar solicitação' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.solicitacao.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    const allowedFields = ['titulo', 'descricao', 'contexto', 'urgencia']
    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field]
    }

    const updated = await prisma.solicitacao.update({
      where: { id },
      data,
      include: { area: { select: { id: true, nome: true } } },
    })

    await logAudit({
      entidade: 'Solicitacao',
      entidadeId: id,
      acao: 'UPDATE',
      dadosAnteriores: existing,
      dadosNovos: updated,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/solicitacoes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar solicitação' }, { status: 500 })
  }
}
