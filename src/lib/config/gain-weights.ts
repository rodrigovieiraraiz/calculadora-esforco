export const GAIN_TYPES = {
  REDUCAO_CUSTO: 'REDUCAO_CUSTO',
  AUMENTO_RECEITA: 'AUMENTO_RECEITA',
  REDUCAO_HORAS: 'REDUCAO_HORAS',
} as const

export type GainType = (typeof GAIN_TYPES)[keyof typeof GAIN_TYPES]

export const DEFAULT_GAIN_WEIGHTS: Record<GainType, number> = {
  REDUCAO_CUSTO: 1.0,
  AUMENTO_RECEITA: 1.2,
  REDUCAO_HORAS: 0.8,
}

export const GAIN_UNITS: Record<GainType, string> = {
  REDUCAO_CUSTO: 'R$',
  AUMENTO_RECEITA: 'R$',
  REDUCAO_HORAS: 'horas/mês',
}

export const GAIN_TYPE_LABELS: Record<GainType, string> = {
  REDUCAO_CUSTO: 'Redução de Custo',
  AUMENTO_RECEITA: 'Aumento de Receita',
  REDUCAO_HORAS: 'Redução de Horas',
}

// Tipos de ganho cujo valorGanho está em horas e precisa ser convertido para R$
export const HOUR_BASED_GAIN_TYPES: Set<string> = new Set([GAIN_TYPES.REDUCAO_HORAS])

export const DEFAULT_VALOR_HORA = 150.0
