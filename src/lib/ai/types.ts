export interface CriterioParaIA {
  id: string
  nome: string
  descricao: string | null
  complexidades: {
    id: string
    nome: string
    descricao: string | null
    ordem: number
  }[]
}

export interface SugestaoCriterio {
  criterioId: string
  criterioNome: string
  complexidadeId: string
  complexidadeNome: string
  justificativa: string
  confianca: number
  componenteId?: string
  componenteNome?: string
}

export interface ComponenteParaIA {
  id: string
  nome: string
  descricao: string | null
}

export interface AIAnalysisRequest {
  descricao: string
  titulo: string
  contexto?: string
  areaNome: string
  criterios: CriterioParaIA[]
  componentes?: ComponenteParaIA[]
}

export interface AIAnalysisResponse {
  criteriosSugeridos: SugestaoCriterio[]
  observacoes: string
  confiancaGeral: number
}

export interface IAProvider {
  analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse>
}
