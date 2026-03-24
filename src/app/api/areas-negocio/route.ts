import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { areaNegocioSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'
import { requireAdmin, AuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ativoParam = searchParams.get('ativo')

    const where: { ativo?: boolean } = {}
    if (ativoParam === 'true') where.ativo = true
    if (ativoParam === 'false') where.ativo = false

    const areasNegocio = await prisma.areaNegocio.findMany({
      where,
      select: {
        id: true,
        nome: true,
        cor: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json(areasNegocio)
  } catch (error) {
    console.error('[GET /api/areas-negocio]', error)
    return NextResponse.json({ error: 'Erro ao listar áreas de negócio' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const parsed = areaNegocioSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const areaNegocio = await prisma.areaNegocio.create({
      data: parsed.data,
    })

    await logAudit({
      entidade: 'AreaNegocio',
      entidadeId: areaNegocio.id,
      acao: 'CREATE',
      dadosNovos: areaNegocio,
      usuario: session.email,
    })

    return NextResponse.json(areaNegocio, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/areas-negocio]', error)
    return NextResponse.json({ error: 'Erro ao criar área de negócio' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids é obrigatório (array)' }, { status: 400 })
    }

    await prisma.areaNegocio.deleteMany({ where: { id: { in: ids } } })

    await logAudit({
      entidade: 'AreaNegocio',
      entidadeId: ids.join(','),
      acao: 'BATCH_DELETE',
      dadosAnteriores: { count: ids.length },
      usuario: session.email,
    })

    return NextResponse.json({ message: `${ids.length} área(s) de negócio removida(s)` })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/areas-negocio]', error)
    return NextResponse.json({ error: 'Erro ao excluir áreas de negócio' }, { status: 500 })
  }
}
