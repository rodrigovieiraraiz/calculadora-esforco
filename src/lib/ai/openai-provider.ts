import OpenAI from "openai"
import { buildAnalysisPrompt } from "./prompt-builder"
import { validateAIResponse } from "./response-validator"
import type { AIAnalysisRequest, AIAnalysisResponse, IAProvider } from "./types"

const MODEL = "gpt-4o"
const TIMEOUT_MS = 60_000
const MAX_TOKENS = 8192

export class OpenAIProvider implements IAProvider {
  private client: OpenAI

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY não configurada. Defina a variável de ambiente antes de usar o OpenAI provider."
      )
    }
    this.client = new OpenAI({ apiKey, timeout: TIMEOUT_MS })
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const prompt = buildAnalysisPrompt(request)

    let rawText: string
    try {
      const response = await this.client.chat.completions.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      })

      rawText = response.choices[0]?.message?.content ?? ""

      // Detect truncated response
      const finishReason = response.choices[0]?.finish_reason
      if (finishReason === "length") {
        console.warn(`[OpenAIProvider] Resposta truncada (finish_reason=length). MAX_TOKENS=${MAX_TOKENS} pode ser insuficiente.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (message.includes("401") || message.includes("Incorrect API key")) {
        throw new Error("OpenAI: API key inválida ou sem permissão.")
      }
      if (message.includes("429") || message.includes("rate limit")) {
        throw new Error(
          "OpenAI: rate limit atingido. Tente novamente em alguns instantes."
        )
      }
      if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
        throw new Error(
          `OpenAI: timeout após ${TIMEOUT_MS / 1000}s. A API não respondeu a tempo.`
        )
      }

      throw new Error(`OpenAI: erro na chamada à API. ${message}`)
    }

    if (!rawText) {
      throw new Error("OpenAI: resposta vazia recebida da API.")
    }

    let parsed: unknown
    try {
      // Remove possíveis blocos de markdown antes do parse
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      throw new Error(
        `OpenAI: resposta não é JSON válido. Conteúdo recebido: ${rawText.slice(0, 200)}`
      )
    }

    const { valid, descartados } = validateAIResponse(parsed, request.criterios, request.componentes)

    if (descartados.length > 0) {
      console.warn(
        `[OpenAIProvider] ${descartados.length} sugestão(ões) descartada(s) por referenciarem IDs inválidos:`,
        descartados
      )
    }

    return valid
  }
}
