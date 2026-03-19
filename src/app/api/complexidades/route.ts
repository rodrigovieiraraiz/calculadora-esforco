import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { complexidadeSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const criterioId = searchParams.get('criterioId')
    const ativoParam = searchParams.get('ativo')

    const where: { criterioId?: string; ativo?: boolean } = {}
    if (criterioId) where.criterioId = criterioId
    if (ativoParam === 'true') where.ativo = true
    if (ativoParam === 'false') where.ativo = false

    const complexidades = await prisma.complexidade.findMany({
      where,
      select: {
        id: true,
        nome: true,
        descricao: true,
        criterioId: true,
        ordem: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
        criterio: { select: { nome: true } },
        esforcos: {
          where: { ativo: true },
          select: { valorEsforco: true },
          take: 1,
        },
      },
      orderBy: [{ criterioId: 'asc' }, { ordem: 'asc' }],
    })

    const result = complexidades.map((c) => ({
      ...c,
      esforcoHoras: c.esforcos[0]?.valorEsforco ?? 0,
      esforcos: undefined,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/complexidades]', error)
    return NextResponse.json({ error: 'Erro ao listar complexidades' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = complexidadeSchema.safeParse(body)

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

    const complexidade = await prisma.complexidade.create({
      data: parsed.data,
    })

    await logAudit({
      entidade: 'Complexidade',
      entidadeId: complexidade.id,
      acao: 'CREATE',
      dadosNovos: complexidade,
    })

    return NextResponse.json(complexidade, { status: 201 })
  } catch (error) {
    console.error('[POST /api/complexidades]', error)
    return NextResponse.json({ error: 'Erro ao criar complexidade' }, { status: 500 })
  }
}
