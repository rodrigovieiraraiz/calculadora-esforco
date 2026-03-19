import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/services/audit'
import { BACKLOG_STATUS } from '@/lib/config/status'
import { rebalancePrioritization } from '@/lib/services/prioritization'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const item = await prisma.backlogItem.findUnique({
      where: { id },
      include: {
        solicitacao: {
          include: {
            area: true,
            criterios: {
              include: {
                criterio: true,
                complexidade: true,
              },
            },
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item de backlog não encontrado' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('[GET /api/backlog/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar item de backlog' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.backlogItem.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Item de backlog não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { status, dataInicio, previsaoConclusao } = body

    const updateData: Record<string, unknown> = {}

    if (status) {
      const validStatuses = Object.values(BACKLOG_STATUS)
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Status inválido', valid: validStatuses },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    if (dataInicio !== undefined) {
      updateData.dataInicio = dataInicio ? new Date(dataInicio) : null
    }

    if (previsaoConclusao !== undefined) {
      updateData.previsaoConclusao = previsaoConclusao ? new Date(previsaoConclusao) : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const updated = await prisma.backlogItem.update({
      where: { id },
      data: updateData,
    })

    await logAudit({
      entidade: 'BacklogItem',
      entidadeId: id,
      acao: 'UPDATE',
      dadosAnteriores: { status: existing.status, dataInicio: existing.dataInicio, previsaoConclusao: existing.previsaoConclusao },
      dadosNovos: updateData,
    })

    if (status && ['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'].includes(status)) {
      await rebalancePrioritization()
      const rebalanced = await prisma.backlogItem.findUnique({ where: { id } })
      return NextResponse.json(rebalanced)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/backlog/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar item de backlog' }, { status: 500 })
  }
}
