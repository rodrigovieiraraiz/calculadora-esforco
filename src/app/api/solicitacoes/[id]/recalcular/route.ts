import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/services/audit'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const solicitacao = await prisma.solicitacao.findUnique({
      where: { id },
      select: { id: true, esforcoTotal: true },
    })

    if (!solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    const includeRelations = {
      criterio: true,
      complexidade: true,
      componente: { select: { id: true, nome: true } },
    }

    const criterios = await prisma.solicitacaoCriterio.findMany({
      where: { solicitacaoId: id },
      include: includeRelations,
    })

    const updatedCriterios = await Promise.all(
      criterios.map(async (sc) => {
        // Try with componenteId first, then without
        let esforco = await prisma.esforco.findFirst({
          where: {
            criterioId: sc.criterioId,
            complexidadeId: sc.complexidadeId,
            componenteId: sc.componenteId,
            ativo: true,
          },
        })
        if (!esforco && sc.componenteId) {
          esforco = await prisma.esforco.findFirst({
            where: {
              criterioId: sc.criterioId,
              complexidadeId: sc.complexidadeId,
              componenteId: null,
              ativo: true,
            },
          })
        }

        if (esforco) {
          return prisma.solicitacaoCriterio.update({
            where: { id: sc.id },
            data: { valorEsforco: esforco.valorEsforco },
            include: includeRelations,
          })
        }

        return sc
      })
    )

    const newTotal = updatedCriterios.reduce((sum, sc) => sum + (sc.valorEsforco ?? 0), 0)

    const updatedSolicitacao = await prisma.solicitacao.update({
      where: { id },
      data: { esforcoTotal: newTotal },
    })

    await logAudit({
      entidade: 'Solicitacao',
      entidadeId: id,
      acao: 'RECALCULAR',
      dadosAnteriores: { esforcoTotal: solicitacao.esforcoTotal },
      dadosNovos: { esforcoTotal: updatedSolicitacao.esforcoTotal },
    })

    return NextResponse.json({
      criterios: updatedCriterios,
      esforcoTotal: newTotal,
    })
  } catch (error) {
    console.error('[POST /api/solicitacoes/[id]/recalcular]', error)
    return NextResponse.json({ error: 'Erro ao recalcular esforço' }, { status: 500 })
  }
}
