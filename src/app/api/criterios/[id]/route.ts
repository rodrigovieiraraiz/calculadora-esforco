import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { criterioSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const criterio = await prisma.criterio.findUnique({
      where: { id },
      include: {
        area: { select: { id: true, nome: true } },
        complexidades: { orderBy: { ordem: 'asc' } },
        esforcos: {
          include: {
            complexidade: { select: { id: true, nome: true } },
          },
        },
      },
    })

    if (!criterio) {
      return NextResponse.json({ error: 'Critério não encontrado' }, { status: 404 })
    }

    return NextResponse.json(criterio)
  } catch (error) {
    console.error('[GET /api/criterios/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar critério' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.criterio.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Critério não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = criterioSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (parsed.data.areaId) {
      const area = await prisma.area.findUnique({ where: { id: parsed.data.areaId } })
      if (!area) {
        return NextResponse.json({ error: 'Área não encontrada' }, { status: 404 })
      }
    }

    const updated = await prisma.criterio.update({
      where: { id },
      data: parsed.data,
    })

    await logAudit({
      entidade: 'Criterio',
      entidadeId: id,
      acao: 'UPDATE',
      dadosAnteriores: existing,
      dadosNovos: updated,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/criterios/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar critério' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.criterio.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Critério não encontrado' }, { status: 404 })
    }

    await prisma.criterio.delete({ where: { id } })

    await logAudit({
      entidade: 'Criterio',
      entidadeId: id,
      acao: 'DELETE',
      dadosAnteriores: existing,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/criterios/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir critério' }, { status: 500 })
  }
}
