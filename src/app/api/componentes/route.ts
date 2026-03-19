import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { componenteSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'
import { requireAdmin, AuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ativoParam = searchParams.get('ativo')
    const areaIdParam = searchParams.get('areaId')

    const where: { ativo?: boolean; areaId?: string } = {}
    if (ativoParam === 'true') where.ativo = true
    if (ativoParam === 'false') where.ativo = false
    if (areaIdParam) where.areaId = areaIdParam

    const componentes = await prisma.componente.findMany({
      where,
      select: {
        id: true,
        nome: true,
        descricao: true,
        areaId: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
        area: {
          select: { id: true, nome: true },
        },
      },
      orderBy: [{ area: { nome: 'asc' } }, { nome: 'asc' }],
    })

    return NextResponse.json(componentes)
  } catch (error) {
    console.error('[GET /api/componentes]', error)
    return NextResponse.json({ error: 'Erro ao listar componentes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = componenteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { nome, descricao, areaId } = parsed.data
    const componente = await prisma.componente.create({
      data: { nome, descricao, areaId },
    })

    await logAudit({
      entidade: 'Componente',
      entidadeId: componente.id,
      acao: 'CREATE',
      dadosNovos: componente,
    })

    return NextResponse.json(componente, { status: 201 })
  } catch (error) {
    console.error('[POST /api/componentes]', error)
    return NextResponse.json({ error: 'Erro ao criar componente' }, { status: 500 })
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

    await prisma.componente.deleteMany({ where: { id: { in: ids } } })

    await logAudit({
      entidade: 'Componente',
      entidadeId: ids.join(','),
      acao: 'BATCH_DELETE',
      dadosAnteriores: { count: ids.length },
      usuario: session.email,
    })

    return NextResponse.json({ message: `${ids.length} componente(s) removido(s)` })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/componentes]', error)
    return NextResponse.json({ error: 'Erro ao excluir componentes' }, { status: 500 })
  }
}
