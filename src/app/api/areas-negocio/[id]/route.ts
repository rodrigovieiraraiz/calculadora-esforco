import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { areaNegocioSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'
import { requireAdmin, AuthError } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params

    const existing = await prisma.areaNegocio.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Área de negócio não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = areaNegocioSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await prisma.areaNegocio.update({
      where: { id },
      data: parsed.data,
    })

    await logAudit({
      entidade: 'AreaNegocio',
      entidadeId: id,
      acao: 'UPDATE',
      dadosAnteriores: existing,
      dadosNovos: updated,
      usuario: session.email,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/areas-negocio/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar área de negócio' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params

    const existing = await prisma.areaNegocio.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Área de negócio não encontrada' }, { status: 404 })
    }

    await prisma.areaNegocio.delete({ where: { id } })

    await logAudit({
      entidade: 'AreaNegocio',
      entidadeId: id,
      acao: 'DELETE',
      dadosAnteriores: existing,
      usuario: session.email,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/areas-negocio/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir área de negócio' }, { status: 500 })
  }
}
