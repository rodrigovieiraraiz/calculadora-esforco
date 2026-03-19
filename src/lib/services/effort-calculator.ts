export interface CriterioEsforco {
  criterioId: string
  criterioNome: string
  complexidadeId: string
  complexidadeNome: string
  valorEsforco: number
  fonte: 'IA' | 'MANUAL'
  justificativa?: string
  confianca?: number
}

export function calculateTotalEffort(criterios: CriterioEsforco[]): number {
  return criterios.reduce((total, criterio) => total + criterio.valorEsforco, 0)
}

export function lookupEffort(
  criterioId: string,
  complexidadeId: string,
  effortsMap: Map<string, number>,
  componenteId?: string | null
): number | null {
  const key = makeEffortKey(criterioId, complexidadeId, componenteId)
  const value = effortsMap.get(key)
  return value !== undefined ? value : null
}

export function makeEffortKey(criterioId: string, complexidadeId: string, componenteId?: string | null): string {
  return `${criterioId}:${complexidadeId}:${componenteId ?? 'null'}`
}
