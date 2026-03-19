import { validateAIResponse } from '@/lib/ai/response-validator'
import type { CriterioParaIA } from '@/lib/ai/types'

const makeCriterio = (overrides: Partial<CriterioParaIA> = {}): CriterioParaIA => ({
  id: 'crit-1',
  nome: 'Criterio 1',
  descricao: null,
  complexidades: [
    { id: 'comp-low', nome: 'Baixa', descricao: null, ordem: 1 },
    { id: 'comp-high', nome: 'Alta', descricao: null, ordem: 2 },
  ],
  ...overrides,
})

const makeRawSugestao = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  criterioId: 'crit-1',
  criterioNome: 'Criterio 1',
  complexidadeId: 'comp-low',
  complexidadeNome: 'Baixa',
  justificativa: 'Justificativa de teste',
  confianca: 0.9,
  ...overrides,
})

const validCriterios: CriterioParaIA[] = [makeCriterio()]

describe('validateAIResponse', () => {
  it('validates and keeps valid suggestions', () => {
    const raw = {
      criteriosSugeridos: [makeRawSugestao()],
      observacoes: 'Tudo certo',
      confiancaGeral: 0.85,
    }
    const { valid, descartados } = validateAIResponse(raw, validCriterios)
    expect(valid.criteriosSugeridos).toHaveLength(1)
    expect(valid.criteriosSugeridos[0].criterioId).toBe('crit-1')
    expect(valid.criteriosSugeridos[0].complexidadeId).toBe('comp-low')
    expect(descartados).toHaveLength(0)
  })

  it('discards criterio with non-existing criterioId', () => {
    const raw = {
      criteriosSugeridos: [makeRawSugestao({ criterioId: 'crit-inexistente' })],
      observacoes: '',
      confiancaGeral: 0.5,
    }
    const { valid, descartados } = validateAIResponse(raw, validCriterios)
    expect(valid.criteriosSugeridos).toHaveLength(0)
    expect(descartados).toHaveLength(1)
    expect(descartados[0]).toContain('crit-inexistente')
  })

  it('discards complexidade not belonging to criterio', () => {
    const raw = {
      criteriosSugeridos: [makeRawSugestao({ complexidadeId: 'comp-inexistente' })],
      observacoes: '',
      confiancaGeral: 0.5,
    }
    const { valid, descartados } = validateAIResponse(raw, validCriterios)
    expect(valid.criteriosSugeridos).toHaveLength(0)
    expect(descartados).toHaveLength(1)
    expect(descartados[0]).toContain('comp-inexistente')
  })

  it('handles empty criteriosSugeridos array', () => {
    const raw = { criteriosSugeridos: [], observacoes: '', confiancaGeral: 0.9 }
    const { valid, descartados } = validateAIResponse(raw, validCriterios)
    expect(valid.criteriosSugeridos).toHaveLength(0)
    expect(descartados).toHaveLength(0)
  })

  it('throws for non-object input', () => {
    expect(() => validateAIResponse('string invalida', validCriterios)).toThrow(
      'Resposta da IA não é um objeto JSON válido'
    )
  })

  it('throws for missing criteriosSugeridos field', () => {
    expect(() => validateAIResponse({ observacoes: 'sem campo' }, validCriterios)).toThrow(
      'criteriosSugeridos'
    )
  })

  it('clamps confidence > 1 to 1', () => {
    const raw = {
      criteriosSugeridos: [makeRawSugestao({ confianca: 1.5 })],
      observacoes: '',
      confiancaGeral: 0.9,
    }
    const { valid } = validateAIResponse(raw, validCriterios)
    expect(valid.criteriosSugeridos[0].confianca).toBe(1)
  })

  it('clamps confidence < 0 to 0', () => {
    const raw = {
      criteriosSugeridos: [makeRawSugestao({ confianca: -0.5 })],
      observacoes: '',
      confiancaGeral: 0.9,
    }
    const { valid } = validateAIResponse(raw, validCriterios)
    expect(valid.criteriosSugeridos[0].confianca).toBe(0)
  })

  it('returns descartados list with reasons', () => {
    const raw = {
      criteriosSugeridos: [
        makeRawSugestao({ criterioId: 'nao-existe-a' }),
        makeRawSugestao({ criterioId: 'nao-existe-b' }),
        makeRawSugestao(),
      ],
      observacoes: '',
      confiancaGeral: 0.7,
    }
    const { valid, descartados } = validateAIResponse(raw, validCriterios)
    expect(valid.criteriosSugeridos).toHaveLength(1)
    expect(descartados).toHaveLength(2)
    expect(descartados.some((d) => d.includes('nao-existe-a'))).toBe(true)
    expect(descartados.some((d) => d.includes('nao-existe-b'))).toBe(true)
  })
})
