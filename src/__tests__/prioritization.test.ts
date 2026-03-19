import {
  normalizeGain,
  calculatePrioritizationScore,
  rankBacklog,
  type BacklogItemForRanking,
} from '@/lib/services/prioritization'

const DEFAULT_GAIN_WEIGHTS: Record<string, number> = {
  REDUCAO_CUSTO: 1.0,
  AUMENTO_RECEITA: 1.2,
  REDUCAO_HORAS: 0.8,
}

const makeItem = (overrides: Partial<BacklogItemForRanking> = {}): BacklogItemForRanking => ({
  id: 'item-1',
  tipoGanho: 'REDUCAO_CUSTO',
  valorGanho: 100,
  esforcoTotal: 10,
  ...overrides,
})

describe('normalizeGain', () => {
  it('applies REDUCAO_CUSTO weight (1.0)', () => {
    expect(normalizeGain('REDUCAO_CUSTO', 100, DEFAULT_GAIN_WEIGHTS)).toBe(100)
  })

  it('applies AUMENTO_RECEITA weight (1.2)', () => {
    expect(normalizeGain('AUMENTO_RECEITA', 100, DEFAULT_GAIN_WEIGHTS)).toBeCloseTo(120)
  })

  it('applies REDUCAO_HORAS weight (0.8)', () => {
    expect(normalizeGain('REDUCAO_HORAS', 100, DEFAULT_GAIN_WEIGHTS)).toBeCloseTo(80)
  })

  it('uses default 1.0 for unknown type', () => {
    expect(normalizeGain('TIPO_DESCONHECIDO', 50, DEFAULT_GAIN_WEIGHTS)).toBe(50)
  })
})

describe('calculatePrioritizationScore', () => {
  it('calculates correctly', () => {
    expect(calculatePrioritizationScore(120, 10)).toBeCloseTo(12)
  })

  it('returns 0 when effort is 0', () => {
    expect(calculatePrioritizationScore(100, 0)).toBe(0)
  })
})

describe('rankBacklog', () => {
  it('orders by score descending', () => {
    const items: BacklogItemForRanking[] = [
      makeItem({ id: 'low', valorGanho: 10, esforcoTotal: 10 }),
      makeItem({ id: 'high', valorGanho: 100, esforcoTotal: 5 }),
      makeItem({ id: 'mid', valorGanho: 50, esforcoTotal: 10 }),
    ]
    const result = rankBacklog(items, DEFAULT_GAIN_WEIGHTS)
    expect(result[0].id).toBe('high')
    expect(result[1].id).toBe('mid')
    expect(result[2].id).toBe('low')
  })

  it('assigns correct positions', () => {
    const items: BacklogItemForRanking[] = [
      makeItem({ id: 'a', valorGanho: 200, esforcoTotal: 10 }),
      makeItem({ id: 'b', valorGanho: 100, esforcoTotal: 10 }),
    ]
    const result = rankBacklog(items, DEFAULT_GAIN_WEIGHTS)
    expect(result[0].posicao).toBe(1)
    expect(result[1].posicao).toBe(2)
  })

  it('handles empty array', () => {
    expect(rankBacklog([], DEFAULT_GAIN_WEIGHTS)).toEqual([])
  })

  it('higher gain lower effort results in higher rank', () => {
    const items: BacklogItemForRanking[] = [
      makeItem({ id: 'penalized', valorGanho: 200, esforcoTotal: 100 }),
      makeItem({ id: 'favored', valorGanho: 50, esforcoTotal: 2 }),
    ]
    const result = rankBacklog(items, DEFAULT_GAIN_WEIGHTS)
    // favored: 50/2 = 25, penalized: 200/100 = 2
    expect(result[0].id).toBe('favored')
    expect(result[1].id).toBe('penalized')
  })
})
