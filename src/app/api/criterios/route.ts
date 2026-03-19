import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { criterioSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const areaId = searchParams.get('areaId')
    const ativoParam = searchParams.get('ativo')
    const componenteId = searchParams.get('componenteId')

    const where: {
      areaId?: string
      ativo?: boolean
      esforcos?: { some: { componenteId: string; ativo: boolean } }
    } = {}
    if (areaId) where.areaId = areaId
    if (ativoParam === 'true') where.ativo = true
    if (ativoParam === 'false') where.ativo = false
    if (componenteId) {
      where.esforcos = { some: { componenteId, ativo: true } }
    }

    const criterios = await prisma.criterio.findMany({
      where,
      select: {
        id: true,
        nome: true,
        descricao: true,
        areaId: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
        area: { select: { nome: true } },
        _count: { select: { complexidades: true } },
      },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json(criterios)
  } catch (error) {
    console.error('[GET /api/criterios]', error)
    return NextResponse.json({ error: 'Erro ao listar critérios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = criterioSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const area = await prisma.area.findUnique({ where: { id: parsed.data.areaId } })
    if (!area) {
      return NextResponse.json({ error: 'Área não encontrada' }, { status: 404 })
    }

    const criterio = await prisma.criterio.create({
      data: parsed.data,
    })

    await logAudit({
      entidade: 'Criterio',
      entidadeId: criterio.id,
      acao: 'CREATE',
      dadosNovos: criterio,
    })

    return NextResponse.json(criterio, { status: 201 })
  } catch (error) {
    console.error('[POST /api/criterios]', error)
    return NextResponse.json({ error: 'Erro ao criar critério' }, { status: 500 })
  }
}
