import { HOUR_BASED_GAIN_TYPES } from '@/lib/config/gain-weights'

const MAX_PRIORIZADO = 5

export async function rebalancePrioritization(): Promise<number> {
  const { prisma } = await import('@/lib/prisma')
  const items = await prisma.backlogItem.findMany({
    where: { status: { in: ['PRIORIZADO', 'NAO_INICIADO'] } },
    orderBy: { scorePriorizacao: 'desc' },
    select: { id: true, status: true },
  })

  const updates: Array<{ id: string; newStatus: string }> = []

  items.forEach((item, index) => {
    const expectedStatus = index < MAX_PRIORIZADO ? 'PRIORIZADO' : 'NAO_INICIADO'
    if (item.status !== expectedStatus) {
      updates.push({ id: item.id, newStatus: expectedStatus })
    }
  })

  if (updates.length > 0) {
    await Promise.all(
      updates.map(({ id, newStatus }) =>
        prisma.backlogItem.update({ where: { id }, data: { status: newStatus } })
      )
    )
  }

  return updates.length
}

export interface BacklogItemForRanking {
  id: string
  tipoGanho: string
  valorGanho: number
  esforcoTotal: number
  ganhoNormalizado?: number
  scorePriorizacao?: number
}

export interface RankedItem extends BacklogItemForRanking {
  ganhoNormalizado: number
  scorePriorizacao: number
  posicao: number
}

export function normalizeGain(
  tipoGanho: string,
  valorGanho: number,
  weights: Record<string, number>,
  valorHora = 150.0
): number {
  const peso = weights[tipoGanho] ?? 1.0
  const valorFinanceiro = HOUR_BASED_GAIN_TYPES.has(tipoGanho)
    ? valorGanho * valorHora
    : valorGanho
  return valorFinanceiro * peso
}

export function calculatePrioritizationScore(
  ganhoNormalizado: number,
  esforcoTotal: number
): number {
  if (esforcoTotal === 0) return 0
  return ganhoNormalizado / esforcoTotal
}

export function rankBacklog(
  items: BacklogItemForRanking[],
  weights: Record<string, number>,
  valorHora = 150.0
): RankedItem[] {
  const scored = items.map((item) => {
    const ganhoNormalizado = normalizeGain(item.tipoGanho, item.valorGanho, weights, valorHora)
    const scorePriorizacao = calculatePrioritizationScore(ganhoNormalizado, item.esforcoTotal)
    return { ...item, ganhoNormalizado, scorePriorizacao }
  })

  return scored
    .sort((a, b) => b.scorePriorizacao - a.scorePriorizacao)
    .map((item, index) => ({ ...item, posicao: index + 1 }))
}
