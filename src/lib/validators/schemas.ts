import { z } from 'zod'

export const areaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  descricao: z.string().max(500).optional().nullable(),
  ativo: z.boolean().optional(),
})

export const componenteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  descricao: z.string().max(500).optional().nullable(),
  areaId: z.string().min(1, 'Área é obrigatória'),
  ativo: z.boolean().optional(),
})

export const criterioSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  descricao: z.string().max(500).optional().nullable(),
  areaId: z.string().min(1, 'Área é obrigatória'),
  ativo: z.boolean().optional(),
})

export const complexidadeSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  descricao: z.string().max(500).optional().nullable(),
  criterioId: z.string().min(1, 'Critério é obrigatório'),
  ordem: z.number().int().min(0).optional(),
  ativo: z.boolean().optional(),
})

export const esforcoSchema = z.object({
  criterioId: z.string().min(1, 'Critério é obrigatório'),
  complexidadeId: z.string().min(1, 'Complexidade é obrigatória'),
  valorEsforco: z.number().positive('Valor deve ser positivo'),
  unidadeEsforco: z.string().optional().default('horas'),
  observacao: z.string().max(500).optional().nullable(),
  ativo: z.boolean().optional(),
})

export const solicitacaoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(200),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  areaId: z.string().min(1, 'Área é obrigatória'),
  contexto: z.string().optional().nullable(),
  urgencia: z.string().optional().nullable(),
  solicitante: z.string().min(1, 'Solicitante é obrigatório').max(100),
  areaSolicitante: z.string().min(1, 'Área Solicitante é obrigatória').max(100),
  zeevNumber: z.string().min(1, 'Número Zeev é obrigatório').max(100),
})

export const GAIN_TYPES_ENUM = ['REDUCAO_CUSTO', 'AUMENTO_RECEITA', 'REDUCAO_HORAS'] as const

export const backlogItemSchema = z.object({
  solicitacaoId: z.string().min(1, 'Solicitação é obrigatória'),
  tipoGanho: z.enum(GAIN_TYPES_ENUM, { message: 'Tipo de ganho inválido' }),
  valorGanho: z.number().positive('Valor do ganho deve ser positivo'),
  descricaoPremissa: z.string().max(500).optional().nullable(),
})
