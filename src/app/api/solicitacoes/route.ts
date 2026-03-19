import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { solicitacaoSchema } from '@/lib/validators/schemas'
import { logAudit } from '@/lib/services/audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const areaId = searchParams.get('areaId')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (areaId) where.areaId = areaId

    const solicitacoes = await prisma.solicitacao.findMany({
      where,
      include: {
        area: { select: { id: true, nome: true } },
        _count: { select: { criterios: true } },
        backlogItem: { select: { id: true, scorePriorizacao: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(solicitacoes)
  } catch (error) {
    console.error('[GET /api/solicitacoes]', error)
    return NextResponse.json({ error: 'Erro ao listar solicitações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = solicitacaoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const area = await prisma.area.findUnique({ where: { id: parsed.data.areaId } })
    if (!area) {
      return NextResponse.json({ error: 'Área não encontrada' }, { status: 404 })
    }

    const solicitacao = await prisma.solicitacao.create({
      data: {
        ...parsed.data,
        status: 'NOVO',
      },
      include: { area: { select: { id: true, nome: true } } },
    })

    await logAudit({
      entidade: 'Solicitacao',
      entidadeId: solicitacao.id,
      acao: 'CREATE',
      dadosNovos: solicitacao,
    })

    return NextResponse.json(solicitacao, { status: 201 })
  } catch (error) {
    console.error('[POST /api/solicitacoes]', error)
    return NextResponse.json({ error: 'Erro ao criar solicitação' }, { status: 500 })
  }
}
