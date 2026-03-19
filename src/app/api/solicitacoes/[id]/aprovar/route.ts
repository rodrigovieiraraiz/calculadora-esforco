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
    })

    if (!solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    if (!solicitacao.esforcoTotal || solicitacao.esforcoTotal <= 0) {
      return NextResponse.json(
        { error: 'Esforço total deve ser maior que zero para aprovar' },
        { status: 400 }
      )
    }

    const updated = await prisma.solicitacao.update({
      where: { id },
      data: {
        esforcoAprovado: true,
        status: 'APROVADO',
      },
    })

    await logAudit({
      entidade: 'Solicitacao',
      entidadeId: id,
      acao: 'APROVAR',
      dadosAnteriores: { esforcoAprovado: solicitacao.esforcoAprovado, status: solicitacao.status },
      dadosNovos: { esforcoAprovado: updated.esforcoAprovado, status: updated.status },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[POST /api/solicitacoes/[id]/aprovar]', error)
    return NextResponse.json({ error: 'Erro ao aprovar solicitação' }, { status: 500 })
  }
}
