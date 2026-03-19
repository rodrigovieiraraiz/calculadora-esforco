import {
  calculateTotalEffort,
  lookupEffort,
  makeEffortKey,
  type CriterioEsforco,
} from '@/lib/services/effort-calculator'

const makeCriterio = (overrides: Partial<CriterioEsforco> = {}): CriterioEsforco => ({
  criterioId: 'crit-1',
  criterioNome: 'Criterio 1',
  complexidadeId: 'comp-1',
  complexidadeNome: 'Baixa',
  valorEsforco: 10,
  fonte: 'MANUAL',
  ...overrides,
})

describe('calculateTotalEffort', () => {
  it('sums correctly with multiple criterios', () => {
    const criterios: CriterioEsforco[] = [
      makeCriterio({ criterioId: 'crit-1', valorEsforco: 10 }),
      makeCriterio({ criterioId: 'crit-2', valorEsforco: 20 }),
      makeCriterio({ criterioId: 'crit-3', valorEsforco: 5 }),
    ]
    expect(calculateTotalEffort(criterios)).toBe(35)
  })

  it('returns 0 for empty array', () => {
    expect(calculateTotalEffort([])).toBe(0)
  })

  it('handles single criterio', () => {
    const criterios: CriterioEsforco[] = [makeCriterio({ valorEsforco: 42 })]
    expect(calculateTotalEffort(criterios)).toBe(42)
  })
})

describe('lookupEffort', () => {
  const effortsMap = new Map<string, number>([
    ['crit-1:comp-low:null', 8],
    ['crit-2:comp-high:componente-1', 40],
  ])

  it('returns value for existing key without componenteId', () => {
    expect(lookupEffort('crit-1', 'comp-low', effortsMap)).toBe(8)
  })

  it('returns value for existing key with componenteId', () => {
    expect(lookupEffort('crit-2', 'comp-high', effortsMap, 'componente-1')).toBe(40)
  })

  it('returns null for non-existing key', () => {
    expect(lookupEffort('crit-99', 'comp-low', effortsMap)).toBeNull()
  })
})

describe('makeEffortKey', () => {
  it('creates correct key format without componenteId', () => {
    expect(makeEffortKey('crit-abc', 'comp-xyz')).toBe('crit-abc:comp-xyz:null')
  })

  it('creates correct key format with componenteId', () => {
    expect(makeEffortKey('crit-abc', 'comp-xyz', 'comp-1')).toBe('crit-abc:comp-xyz:comp-1')
  })

  it('treats null componenteId as null string', () => {
    expect(makeEffortKey('crit-abc', 'comp-xyz', null)).toBe('crit-abc:comp-xyz:null')
  })
})
