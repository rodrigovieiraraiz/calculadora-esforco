import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { areaSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const area = await prisma.area.findUnique({
      where: { id },
      include: {
        criterios: {
          orderBy: { nome: 'asc' },
        },
      },
    })

    if (!area) {
      return NextResponse.json({ error: 'Área não encontrada' }, { status: 404 })
    }

    return NextResponse.json(area)
  } catch (error) {
    console.error('[GET /api/areas/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar área' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.area.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Área não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = areaSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await prisma.area.update({
      where: { id },
      data: parsed.data,
    })

    await logAudit({
      entidade: 'Area',
      entidadeId: id,
      acao: 'UPDATE',
      dadosAnteriores: existing,
      dadosNovos: updated,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/areas/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar área' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.area.findUnique({
      where: { id },
      include: { _count: { select: { solicitacoes: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Área não encontrada' }, { status: 404 })
    }

    if (existing._count.solicitacoes > 0) {
      return NextResponse.json(
        { error: 'Área possui solicitações vinculadas e não pode ser excluída' },
        { status: 400 }
      )
    }

    await prisma.area.delete({ where: { id } })

    await logAudit({
      entidade: 'Area',
      entidadeId: id,
      acao: 'DELETE',
      dadosAnteriores: existing,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/areas/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir área' }, { status: 500 })
  }
}
