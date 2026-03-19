import type { AIAnalysisResponse, ComponenteParaIA, CriterioParaIA, SugestaoCriterio } from "./types"

function clampConfianca(value: unknown): number {
  const num = typeof value === "number" ? value : parseFloat(String(value))
  if (isNaN(num)) return 0
  return Math.min(1, Math.max(0, num))
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function validateAIResponse(
  raw: unknown,
  validCriterios: CriterioParaIA[],
  validComponentes?: ComponenteParaIA[]
): { valid: AIAnalysisResponse; descartados: string[] } {
  const descartados: string[] = []

  if (!isPlainObject(raw)) {
    throw new Error("Resposta da IA não é um objeto JSON válido")
  }

  const criterioMap = new Map(validCriterios.map((c) => [c.id, c]))
  const componenteMap = validComponentes
    ? new Map(validComponentes.map((c) => [c.id, c]))
    : null

  const rawSugestoes = raw["criteriosSugeridos"]
  if (!Array.isArray(rawSugestoes)) {
    throw new Error('Campo "criteriosSugeridos" ausente ou não é um array')
  }

  const criteriosSugeridos: SugestaoCriterio[] = []

  for (const item of rawSugestoes) {
    if (!isPlainObject(item)) {
      descartados.push(`Item inválido (não é objeto): ${JSON.stringify(item)}`)
      continue
    }

    const criterioId = String(item["criterioId"] ?? "")
    const complexidadeId = String(item["complexidadeId"] ?? "")
    const criterioNome = String(item["criterioNome"] ?? "")
    const complexidadeNome = String(item["complexidadeNome"] ?? "")
    const justificativa = String(item["justificativa"] ?? "")
    const confianca = clampConfianca(item["confianca"])

    const criterio = criterioMap.get(criterioId)
    if (!criterio) {
      descartados.push(
        `Critério inexistente descartado: criterioId="${criterioId}" criterioNome="${criterioNome}"`
      )
      continue
    }

    const complexidadeExiste = criterio.complexidades.some(
      (cx) => cx.id === complexidadeId
    )
    if (!complexidadeExiste) {
      descartados.push(
        `Complexidade inexistente descartada: criterioId="${criterioId}" complexidadeId="${complexidadeId}" complexidadeNome="${complexidadeNome}"`
      )
      continue
    }

    // Validate componenteId if provided
    let componenteId: string | undefined
    let componenteNome: string | undefined
    const rawComponenteId = item["componenteId"]
    if (rawComponenteId != null && rawComponenteId !== "") {
      const cid = String(rawComponenteId)
      if (componenteMap && componenteMap.has(cid)) {
        componenteId = cid
        componenteNome = componenteMap.get(cid)!.nome
      }
      // If componenteId is provided but invalid, simply omit it (don't discard the criterion)
    }

    criteriosSugeridos.push({
      criterioId,
      criterioNome,
      complexidadeId,
      complexidadeNome,
      justificativa,
      confianca,
      componenteId,
      componenteNome,
    })
  }

  const observacoes =
    typeof raw["observacoes"] === "string" ? raw["observacoes"] : ""

  const confiancaGeral =
    criteriosSugeridos.length > 0
      ? clampConfianca(raw["confiancaGeral"])
      : 0

  return {
    valid: {
      criteriosSugeridos,
      observacoes,
      confiancaGeral,
    },
    descartados,
  }
}
