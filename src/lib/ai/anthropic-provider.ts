import Anthropic from "@anthropic-ai/sdk"
import { buildAnalysisPrompt } from "./prompt-builder"
import { validateAIResponse } from "./response-validator"
import type { AIAnalysisRequest, AIAnalysisResponse, IAProvider } from "./types"

const MODEL = "claude-haiku-4-5-20251001"
const TIMEOUT_MS = 60_000
const MAX_TOKENS = 8192

export class AnthropicProvider implements IAProvider {
  private client: Anthropic

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY não configurada. Defina a variável de ambiente antes de usar o Anthropic provider."
      )
    }
    this.client = new Anthropic({ apiKey, timeout: TIMEOUT_MS })
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const prompt = buildAnalysisPrompt(request)

    let rawText: string
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      })

      const block = response.content.find((b) => b.type === "text")
      rawText = block?.type === "text" ? block.text : ""

      // Detect truncated response
      if (response.stop_reason === "max_tokens") {
        console.warn(`[AnthropicProvider] Resposta truncada (stop_reason=max_tokens). MAX_TOKENS=${MAX_TOKENS} pode ser insuficiente.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (message.includes("401") || message.includes("authentication")) {
        throw new Error("Anthropic: API key inválida ou sem permissão.")
      }
      if (message.includes("429") || message.includes("rate_limit")) {
        throw new Error(
          "Anthropic: rate limit atingido. Tente novamente em alguns instantes."
        )
      }
      if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
        throw new Error(
          `Anthropic: timeout após ${TIMEOUT_MS / 1000}s. A API não respondeu a tempo.`
        )
      }

      throw new Error(`Anthropic: erro na chamada à API. ${message}`)
    }

    if (!rawText) {
      throw new Error("Anthropic: resposta vazia recebida da API.")
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
        `Anthropic: resposta não é JSON válido. Conteúdo recebido: ${rawText.slice(0, 200)}`
      )
    }

    const { valid, descartados } = validateAIResponse(parsed, request.criterios, request.componentes)

    if (descartados.length > 0) {
      console.warn(
        `[AnthropicProvider] ${descartados.length} sugestão(ões) descartada(s) por referenciarem IDs inválidos:`,
        descartados
      )
    }

    return valid
  }
}
