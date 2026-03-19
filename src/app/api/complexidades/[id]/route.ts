import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { complexidadeSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const complexidade = await prisma.complexidade.findUnique({
      where: { id },
      include: {
        criterio: { select: { id: true, nome: true } },
      },
    })

    if (!complexidade) {
      return NextResponse.json({ error: 'Complexidade não encontrada' }, { status: 404 })
    }

    return NextResponse.json(complexidade)
  } catch (error) {
    console.error('[GET /api/complexidades/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar complexidade' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.complexidade.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Complexidade não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = complexidadeSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await prisma.complexidade.update({
      where: { id },
      data: parsed.data,
    })

    await logAudit({
      entidade: 'Complexidade',
      entidadeId: id,
      acao: 'UPDATE',
      dadosAnteriores: existing,
      dadosNovos: updated,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/complexidades/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar complexidade' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.complexidade.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Complexidade não encontrada' }, { status: 404 })
    }

    await prisma.complexidade.delete({ where: { id } })

    await logAudit({
      entidade: 'Complexidade',
      entidadeId: id,
      acao: 'DELETE',
      dadosAnteriores: existing,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/complexidades/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir complexidade' }, { status: 500 })
  }
}
