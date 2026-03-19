import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/services/audit'
import { requireAdmin, AuthError } from '@/lib/auth'
import { backlogItemSchema } from '@/lib/validators/schemas'
import { DEFAULT_GAIN_WEIGHTS, GAIN_UNITS } from '@/lib/config/gain-weights'
import { normalizeGain, calculatePrioritizationScore, rebalancePrioritization } from '@/lib/services/prioritization'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const areaId = searchParams.get('areaId')
    const tipoGanho = searchParams.get('tipoGanho')

    const where: any = {}
    if (status) where.status = status
    if (tipoGanho) where.tipoGanho = tipoGanho
    if (areaId) where.solicitacao = { areaId }

    const items = await prisma.backlogItem.findMany({
      where,
      include: {
        solicitacao: {
          include: {
            area: { select: { id: true, nome: true } },
          },
        },
      },
      orderBy: { scorePriorizacao: 'desc' },
    })

    const ranked = items.map((item, index) => ({
      ...item,
      posicao: index + 1,
    }))

    return NextResponse.json(ranked)
  } catch (error) {
    console.error('[GET /api/backlog]', error)
    return NextResponse.json({ error: 'Erro ao listar backlog' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = backlogItemSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { solicitacaoId, tipoGanho, valorGanho, descricaoPremissa } = parsed.data

    const solicitacao = await prisma.solicitacao.findUnique({
      where: { id: solicitacaoId },
    })

    if (!solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    if (!solicitacao.esforcoAprovado) {
      return NextResponse.json({ error: 'Esforço não aprovado' }, { status: 400 })
    }

    const existing = await prisma.backlogItem.findFirst({
      where: { solicitacaoId },
    })

    if (existing) {
      return NextResponse.json({ error: 'Já existe item no backlog' }, { status: 400 })
    }

    let gainWeight: number
    const gainWeightConfig = await prisma.gainWeightConfig.findUnique({
      where: { tipoGanho },
    })

    if (gainWeightConfig) {
      gainWeight = gainWeightConfig.peso
    } else {
      gainWeight = DEFAULT_GAIN_WEIGHTS[tipoGanho] ?? 1.0
    }

    const weights = { [tipoGanho]: gainWeight }
    const ganhoNormalizado = normalizeGain(tipoGanho, valorGanho, weights)
    const scorePriorizacao = calculatePrioritizationScore(
      ganhoNormalizado,
      solicitacao.esforcoTotal ?? 0
    )
    const unidadeGanho = GAIN_UNITS[tipoGanho]

    const item = await prisma.backlogItem.create({
      data: {
        solicitacaoId,
        tipoGanho,
        valorGanho,
        descricaoPremissa,
        ganhoNormalizado,
        scorePriorizacao,
        unidadeGanho,
      },
    })

    await logAudit({
      entidade: 'BacklogItem',
      entidadeId: item.id,
      acao: 'CREATE',
      dadosNovos: item,
    })

    await rebalancePrioritization()

    const updatedItem = await prisma.backlogItem.findUnique({ where: { id: item.id } })

    return NextResponse.json(updatedItem, { status: 201 })
  } catch (error) {
    console.error('[POST /api/backlog]', error)
    return NextResponse.json({ error: 'Erro ao criar item no backlog' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids é obrigatório (array)' }, { status: 400 })
    }

    await prisma.backlogItem.deleteMany({
      where: { id: { in: ids } },
    })

    await logAudit({
      entidade: 'BacklogItem',
      entidadeId: ids.join(','),
      acao: 'BATCH_DELETE',
      dadosAnteriores: { count: ids.length },
      usuario: session.email,
    })

    return NextResponse.json({ message: `${ids.length} item(ns) removido(s)` })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/backlog]', error)
    return NextResponse.json({ error: 'Erro ao excluir itens do backlog' }, { status: 500 })
  }
}
