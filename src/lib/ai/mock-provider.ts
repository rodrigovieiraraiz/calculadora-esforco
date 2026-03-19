import type {
  AIAnalysisRequest,
  AIAnalysisResponse,
  CriterioParaIA,
  IAProvider,
  SugestaoCriterio,
} from "./types"

const PALAVRAS_ALTA_COMPLEXIDADE = [
  "complexo",
  "complexa",
  "crítico",
  "crítica",
  "urgente",
  "grande",
  "extenso",
  "extensa",
  "alto risco",
  "alta escala",
  "integração",
  "migração",
  "refatoração",
]

// Critérios obrigatórios: atividades que sempre existem em um projeto
const PALAVRAS_CRITERIOS_OBRIGATORIOS = [
  "documentacao", "documentação", "documento", "manual", "especificacao", "especificação",
  "levantamento", "requisito", "analise", "análise", "refinamento", "entendimento",
  "teste", "testes", "test", "homologacao", "homologação", "validacao", "validação", "qa",
  "integracao", "integração", "deploy", "implantacao", "implantação", "ambiente",
]

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function extrairPalavras(texto: string): string[] {
  return normalizarTexto(texto)
    .split(/\W+/)
    .filter((p) => p.length > 2)
}

function calcularSimilaridade(
  palavrasDemanda: string[],
  termoCriterio: string
): number {
  const palavrasCriterio = extrairPalavras(termoCriterio)
  const matches = palavrasCriterio.filter((p) => palavrasDemanda.includes(p))
  if (palavrasCriterio.length === 0) return 0
  return matches.length / palavrasCriterio.length
}

function detectarAltaComplexidade(textoDemanda: string): boolean {
  const normalizado = normalizarTexto(textoDemanda)
  return PALAVRAS_ALTA_COMPLEXIDADE.some((palavra) =>
    normalizado.includes(normalizarTexto(palavra))
  )
}

function escolherComplexidade(
  criterio: CriterioParaIA,
  altaComplexidade: boolean
): CriterioParaIA["complexidades"][number] | null {
  if (criterio.complexidades.length === 0) return null

  const ordenadas = [...criterio.complexidades].sort(
    (a, b) => a.ordem - b.ordem
  )

  if (altaComplexidade) {
    // Pega o último terço como "Alta"
    const idx = Math.floor((ordenadas.length * 2) / 3)
    return ordenadas[Math.min(idx, ordenadas.length - 1)]
  }

  // Complexidade "Média": posição central
  const idx = Math.floor(ordenadas.length / 2)
  return ordenadas[idx]
}

export class MockProvider implements IAProvider {
  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const textoDemanda = [
      request.titulo,
      request.descricao,
      request.contexto ?? "",
    ].join(" ")

    const palavrasDemanda = extrairPalavras(textoDemanda)
    const altaComplexidade = detectarAltaComplexidade(textoDemanda)

    const sugestoes: SugestaoCriterio[] = []
    const criteriosIncluidos = new Set<string>()

    // Helper: verifica se um critério é obrigatório (documentação, testes, levantamento, integração)
    const ehCriterioObrigatorio = (criterio: CriterioParaIA): boolean => {
      const termos = normalizarTexto([criterio.nome, criterio.descricao ?? ""].join(" "))
      return PALAVRAS_CRITERIOS_OBRIGATORIOS.some((p) => termos.includes(normalizarTexto(p)))
    }

    // Primeira passagem: inclui critérios com match semântico
    for (const criterio of request.criterios) {
      const termosParaMatch = [
        criterio.nome,
        criterio.descricao ?? "",
      ].join(" ")

      const similaridade = calcularSimilaridade(palavrasDemanda, termosParaMatch)

      if (similaridade < 0.1 && !ehCriterioObrigatorio(criterio)) {
        continue
      }

      const complexidade = escolherComplexidade(criterio, altaComplexidade)
      if (!complexidade) continue

      let confianca = similaridade > 0 ? 0.7 : 0.55
      if (altaComplexidade && similaridade > 0) confianca = 0.75

      sugestoes.push({
        criterioId: criterio.id,
        criterioNome: criterio.nome,
        complexidadeId: complexidade.id,
        complexidadeNome: complexidade.nome,
        justificativa: altaComplexidade
          ? `A demanda contém indicadores de alta complexidade. Nível "${complexidade.nome}" sugerido para o critério "${criterio.nome}".`
          : `Análise baseada nas características da demanda. Nível "${complexidade.nome}" sugerido como estimativa inicial para "${criterio.nome}".`,
        confianca,
      })
      criteriosIncluidos.add(criterio.id)
    }

    // Segunda passagem: garante que critérios obrigatórios sempre sejam incluídos
    for (const criterio of request.criterios) {
      if (criteriosIncluidos.has(criterio.id)) continue
      if (!ehCriterioObrigatorio(criterio)) continue

      const complexidade = escolherComplexidade(criterio, false)
      if (!complexidade) continue

      sugestoes.push({
        criterioId: criterio.id,
        criterioNome: criterio.nome,
        complexidadeId: complexidade.id,
        complexidadeNome: complexidade.nome,
        justificativa: `Atividade obrigatória de projeto. Nível "${complexidade.nome}" sugerido para "${criterio.nome}" com base no escopo geral da demanda.`,
        confianca: 0.6,
      })
      criteriosIncluidos.add(criterio.id)
    }

    // Garante pelo menos 1 sugestão se há critérios disponíveis
    if (sugestoes.length === 0 && request.criterios.length > 0) {
      const primeiroCriterio = request.criterios[0]
      const complexidade = escolherComplexidade(primeiroCriterio, false)
      if (complexidade) {
        sugestoes.push({
          criterioId: primeiroCriterio.id,
          criterioNome: primeiroCriterio.nome,
          complexidadeId: complexidade.id,
          complexidadeNome: complexidade.nome,
          justificativa: `Sugestão padrão para "${primeiroCriterio.nome}" com base na demanda fornecida.`,
          confianca: 0.5,
        })
      }
    }

    const confiancaGeral =
      sugestoes.length > 0
        ? sugestoes.reduce((acc, s) => acc + s.confianca, 0) / sugestoes.length
        : 0

    return {
      criteriosSugeridos: sugestoes,
      observacoes:
        "Análise gerada pelo provider mock (sem IA real). Os resultados são baseados em correspondência de palavras-chave e devem ser revisados manualmente.",
      confiancaGeral: Math.round(confiancaGeral * 100) / 100,
    }
  }
}
