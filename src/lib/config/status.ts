export const SOLICITACAO_STATUS = {
  NOVO: 'NOVO',
  ESTIMADO: 'ESTIMADO',
  APROVADO: 'APROVADO',
} as const

export type SolicitacaoStatus = (typeof SOLICITACAO_STATUS)[keyof typeof SOLICITACAO_STATUS]

export const SOLICITACAO_STATUS_LABELS: Record<SolicitacaoStatus, string> = {
  NOVO: 'Novo',
  ESTIMADO: 'Estimado',
  APROVADO: 'Aprovado',
}

export const BACKLOG_STATUS = {
  NAO_INICIADO: 'NAO_INICIADO',
  PRIORIZADO: 'PRIORIZADO',
  EM_ANDAMENTO: 'EM_ANDAMENTO',
  CONCLUIDO: 'CONCLUIDO',
  CANCELADO: 'CANCELADO',
} as const

export type BacklogStatus = (typeof BACKLOG_STATUS)[keyof typeof BACKLOG_STATUS]

export const BACKLOG_STATUS_LABELS: Record<BacklogStatus, string> = {
  NAO_INICIADO: 'Não Iniciado',
  PRIORIZADO: 'Priorizado',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}
