import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { componenteSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const componente = await prisma.componente.findUnique({
      where: { id },
      include: {
        area: { select: { id: true, nome: true } },
      },
    })

    if (!componente) {
      return NextResponse.json({ error: 'Componente não encontrado' }, { status: 404 })
    }

    return NextResponse.json(componente)
  } catch (error) {
    console.error('[GET /api/componentes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar componente' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.componente.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Componente não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = componenteSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await prisma.componente.update({
      where: { id },
      data: parsed.data,
      include: { area: { select: { id: true, nome: true } } },
    })

    await logAudit({
      entidade: 'Componente',
      entidadeId: id,
      acao: 'UPDATE',
      dadosAnteriores: existing,
      dadosNovos: updated,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/componentes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar componente' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.componente.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Componente não encontrado' }, { status: 404 })
    }

    await prisma.componente.delete({ where: { id } })

    await logAudit({
      entidade: 'Componente',
      entidadeId: id,
      acao: 'DELETE',
      dadosAnteriores: existing,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/componentes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir componente' }, { status: 500 })
  }
}
