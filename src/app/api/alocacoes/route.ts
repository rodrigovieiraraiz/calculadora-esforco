import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const funcionarioId = searchParams.get('funcionarioId')

    const where: Record<string, unknown> = {}

    if (funcionarioId) where.funcionarioId = funcionarioId

    if (dataInicio || dataFim) {
      where.OR = [
        {
          dataInicio: {
            ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
            ...(dataFim ? { lte: new Date(dataFim) } : {}),
          },
        },
        {
          dataFim: {
            ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
            ...(dataFim ? { lte: new Date(dataFim) } : {}),
          },
        },
      ]
    }

    const alocacoes = await prisma.alocacao.findMany({
      where,
      include: {
        funcionario: { select: { id: true, nome: true, cargo: true } },
        backlogItem: {
          select: {
            id: true,
            solicitacao: {
              select: {
                titulo: true,
                areaSolicitante: true,
                area: { select: { nome: true } },
              },
            },
          },
        },
      },
      orderBy: [{ dataInicio: 'asc' }, { funcionario: { nome: 'asc' } }],
    })

    return NextResponse.json(alocacoes)
  } catch (error) {
    console.error('[GET /api/alocacoes]', error)
    return NextResponse.json({ error: 'Erro ao listar alocações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOperator()
    const body = await request.json()
    const { funcionarioId, backlogItemId, titulo, dataInicio, dataFim, areaSolicitante, cor } = body

    if (!funcionarioId) {
      return NextResponse.json({ error: 'funcionarioId é obrigatório' }, { status: 400 })
    }
    if (!titulo?.trim()) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
    }
    if (!dataInicio || !dataFim) {
      return NextResponse.json({ error: 'Data início e data fim são obrigatórias' }, { status: 400 })
    }

    const alocacao = await prisma.alocacao.create({
      data: {
        funcionarioId,
        backlogItemId: backlogItemId || null,
        titulo: titulo.trim(),
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        areaSolicitante: areaSolicitante?.trim() || null,
        cor: cor?.trim() || null,
      },
      include: {
        funcionario: { select: { id: true, nome: true, cargo: true } },
      },
    })

    if (backlogItemId) {
      await prisma.backlogItem.update({
        where: { id: backlogItemId },
        data: {
          dataInicio: new Date(dataInicio),
          previsaoConclusao: new Date(dataFim),
        },
      })
    }

    return NextResponse.json(alocacao, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/alocacoes]', error)
    return NextResponse.json({ error: 'Erro ao criar alocação' }, { status: 500 })
  }
}
