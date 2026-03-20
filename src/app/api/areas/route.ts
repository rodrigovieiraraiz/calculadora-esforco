import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { areaSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'
import { requireOperator, AuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ativoParam = searchParams.get('ativo')

    const where: { ativo?: boolean } = {}
    if (ativoParam === 'true') where.ativo = true
    if (ativoParam === 'false') where.ativo = false

    const areas = await prisma.area.findMany({
      where,
      select: {
        id: true,
        nome: true,
        descricao: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { criterios: true },
        },
      },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json(areas)
  } catch (error) {
    console.error('[GET /api/areas]', error)
    return NextResponse.json({ error: 'Erro ao listar áreas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = areaSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const area = await prisma.area.create({
      data: parsed.data,
    })

    await logAudit({
      entidade: 'Area',
      entidadeId: area.id,
      acao: 'CREATE',
      dadosNovos: area,
    })

    return NextResponse.json(area, { status: 201 })
  } catch (error) {
    console.error('[POST /api/areas]', error)
    return NextResponse.json({ error: 'Erro ao criar área' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireOperator()
    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids é obrigatório (array)' }, { status: 400 })
    }

    // Cascade: remove all related data
    for (const id of ids) {
      const criterios = await prisma.criterio.findMany({ where: { areaId: id }, select: { id: true } })
      const criterioIds = criterios.map(c => c.id)

      if (criterioIds.length > 0) {
        await prisma.solicitacaoCriterio.deleteMany({ where: { criterioId: { in: criterioIds } } })
        await prisma.esforco.deleteMany({ where: { criterioId: { in: criterioIds } } })
        await prisma.complexidade.deleteMany({ where: { criterioId: { in: criterioIds } } })
        await prisma.criterio.deleteMany({ where: { areaId: id } })
      }

      // Remove backlog items and solicitacoes for this area
      const solicitacoes = await prisma.solicitacao.findMany({ where: { areaId: id }, select: { id: true } })
      const solIds = solicitacoes.map(s => s.id)
      if (solIds.length > 0) {
        await prisma.backlogItem.deleteMany({ where: { solicitacaoId: { in: solIds } } })
        await prisma.solicitacaoCriterio.deleteMany({ where: { solicitacaoId: { in: solIds } } })
        await prisma.solicitacao.deleteMany({ where: { areaId: id } })
      }

      await prisma.area.delete({ where: { id } })
    }

    await logAudit({
      entidade: 'Area',
      entidadeId: ids.join(','),
      acao: 'BATCH_DELETE',
      dadosAnteriores: { count: ids.length },
      usuario: session.email,
    })

    return NextResponse.json({ message: `${ids.length} área(s) removida(s)` })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/areas]', error)
    return NextResponse.json({ error: 'Erro ao excluir áreas' }, { status: 500 })
  }
}
