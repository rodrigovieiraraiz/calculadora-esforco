import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { esforcoSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const criterioId = searchParams.get('criterioId')

    const where: { criterioId?: string } = {}
    if (criterioId) where.criterioId = criterioId

    const esforcos = await prisma.esforco.findMany({
      where,
      select: {
        id: true,
        criterioId: true,
        complexidadeId: true,
        valorEsforco: true,
        unidadeEsforco: true,
        observacao: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
        criterio: { select: { nome: true } },
        complexidade: { select: { nome: true } },
      },
      orderBy: [{ criterioId: 'asc' }, { complexidadeId: 'asc' }],
    })

    return NextResponse.json(esforcos)
  } catch (error) {
    console.error('[GET /api/esforcos]', error)
    return NextResponse.json({ error: 'Erro ao listar esforços' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = esforcoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const criterio = await prisma.criterio.findUnique({ where: { id: parsed.data.criterioId } })
    if (!criterio) {
      return NextResponse.json({ error: 'Critério não encontrado' }, { status: 404 })
    }

    const complexidade = await prisma.complexidade.findUnique({
      where: { id: parsed.data.complexidadeId },
    })
    if (!complexidade) {
      return NextResponse.json({ error: 'Complexidade não encontrada' }, { status: 404 })
    }

    const esforco = await prisma.esforco.create({
      data: parsed.data,
    })

    await logAudit({
      entidade: 'Esforco',
      entidadeId: esforco.id,
      acao: 'CREATE',
      dadosNovos: esforco,
    })

    return NextResponse.json(esforco, { status: 201 })
  } catch (error: unknown) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Já existe um esforço cadastrado para este critério e complexidade' },
        { status: 409 }
      )
    }
    console.error('[POST /api/esforcos]', error)
    return NextResponse.json({ error: 'Erro ao criar esforço' }, { status: 500 })
  }
}
