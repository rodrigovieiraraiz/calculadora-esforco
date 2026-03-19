import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { criterioId, complexidadeId, componenteId } = body

    if (!criterioId || !complexidadeId) {
      return NextResponse.json(
        { error: 'criterioId e complexidadeId são obrigatórios' },
        { status: 400 }
      )
    }

    // Get solicitacao to know the area
    const solicitacao = await prisma.solicitacao.findUnique({ where: { id } })
    if (!solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    // Validate criterio belongs to the area
    const criterio = await prisma.criterio.findUnique({ where: { id: criterioId } })
    if (!criterio || criterio.areaId !== solicitacao.areaId) {
      return NextResponse.json(
        { error: 'Critério não encontrado ou não pertence à área da solicitação' },
        { status: 400 }
      )
    }

    // Validate complexidade belongs to the criterio
    const complexidade = await prisma.complexidade.findUnique({ where: { id: complexidadeId } })
    if (!complexidade || complexidade.criterioId !== criterioId) {
      return NextResponse.json(
        { error: 'Complexidade não encontrada ou não pertence ao critério' },
        { status: 400 }
      )
    }

    // Validate componente if provided
    if (componenteId) {
      const componente = await prisma.componente.findUnique({ where: { id: componenteId } })
      if (!componente || componente.areaId !== solicitacao.areaId) {
        return NextResponse.json(
          { error: 'Componente não encontrado ou não pertence à área da solicitação' },
          { status: 400 }
        )
      }
    }

    // Lookup esforco (try with componenteId first, then without)
    let esforco = await prisma.esforco.findFirst({
      where: { criterioId, complexidadeId, componenteId: componenteId || null, ativo: true },
    })
    if (!esforco && componenteId) {
      esforco = await prisma.esforco.findFirst({
        where: { criterioId, complexidadeId, componenteId: null, ativo: true },
      })
    }
    if (!esforco) {
      return NextResponse.json(
        { error: 'Esforço não parametrizado para esta combinação critério + complexidade' },
        { status: 400 }
      )
    }

    const includeRelations = {
      criterio: { select: { id: true, nome: true } },
      complexidade: { select: { id: true, nome: true } },
      componente: { select: { id: true, nome: true } },
    }

    // Check if already exists
    const existing = await prisma.solicitacaoCriterio.findFirst({
      where: { solicitacaoId: id, criterioId, componenteId: componenteId || null },
    })
    if (existing) {
      // Update instead of creating duplicate
      const updated = await prisma.solicitacaoCriterio.update({
        where: { id: existing.id },
        data: {
          complexidadeId,
          componenteId: componenteId || null,
          valorEsforco: esforco.valorEsforco,
          fonte: 'MANUAL',
          justificativa: 'Alteração manual pelo operador',
          confianca: null,
        },
        include: includeRelations,
      })
      return NextResponse.json(updated)
    }

    const record = await prisma.solicitacaoCriterio.create({
      data: {
        solicitacaoId: id,
        criterioId,
        complexidadeId,
        componenteId: componenteId || null,
        valorEsforco: esforco.valorEsforco,
        fonte: 'MANUAL',
        justificativa: 'Adicionado manualmente pelo operador',
        confianca: null,
      },
      include: includeRelations,
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('[POST /api/solicitacoes/[id]/criterios]', error)
    return NextResponse.json({ error: 'Erro ao adicionar critério' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { criterioId } = body

    if (!criterioId) {
      return NextResponse.json({ error: 'criterioId é obrigatório' }, { status: 400 })
    }

    const deleted = await prisma.solicitacaoCriterio.deleteMany({
      where: { solicitacaoId: id, criterioId },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Critério não encontrado na solicitação' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Critério removido da solicitação' })
  } catch (error) {
    console.error('[DELETE /api/solicitacoes/[id]/criterios]', error)
    return NextResponse.json({ error: 'Erro ao remover critério' }, { status: 500 })
  }
}
