import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { esforcoSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const esforco = await prisma.esforco.findUnique({
      where: { id },
      include: {
        criterio: { select: { id: true, nome: true } },
        complexidade: { select: { id: true, nome: true } },
      },
    })

    if (!esforco) {
      return NextResponse.json({ error: 'Esforço não encontrado' }, { status: 404 })
    }

    return NextResponse.json(esforco)
  } catch (error) {
    console.error('[GET /api/esforcos/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar esforço' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.esforco.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Esforço não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = esforcoSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await prisma.esforco.update({
      where: { id },
      data: parsed.data,
    })

    await logAudit({
      entidade: 'Esforco',
      entidadeId: id,
      acao: 'UPDATE',
      dadosAnteriores: existing,
      dadosNovos: updated,
    })

    return NextResponse.json(updated)
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
    console.error('[PUT /api/esforcos/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar esforço' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.esforco.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Esforço não encontrado' }, { status: 404 })
    }

    await prisma.esforco.delete({ where: { id } })

    await logAudit({
      entidade: 'Esforco',
      entidadeId: id,
      acao: 'DELETE',
      dadosAnteriores: existing,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/esforcos/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir esforço' }, { status: 500 })
  }
}
