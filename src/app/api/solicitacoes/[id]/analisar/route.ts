import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAIProvider } from '@/lib/ai'
import { makeEffortKey } from '@/lib/services/effort-calculator'
import { logAudit } from '@/lib/services/audit'
import type { ComponenteParaIA, CriterioParaIA } from '@/lib/ai/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. Get solicitacao
    const solicitacao = await prisma.solicitacao.findUnique({
      where: { id },
      include: { area: true },
    })

    if (!solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    // 2. Get active criterios for the area with their complexidades
    const criteriosDB = await prisma.criterio.findMany({
      where: { areaId: solicitacao.areaId, ativo: true },
      include: {
        complexidades: {
          where: { ativo: true },
          orderBy: { ordem: 'asc' },
        },
      },
    })

    if (criteriosDB.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum critério ativo cadastrado para esta área' },
        { status: 400 }
      )
    }

    // 3. Get active components for the area
    const componentesDB = await prisma.componente.findMany({
      where: { areaId: solicitacao.areaId, ativo: true },
    })

    const componentesParaIA: ComponenteParaIA[] = componentesDB.map(c => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
    }))

    // 4. Get all active esforcos and build map (keyed by criterioId:complexidadeId:componenteId)
    const esforcos = await prisma.esforco.findMany({
      where: {
        criterioId: { in: criteriosDB.map(c => c.id) },
        ativo: true,
      },
    })

    const effortsMap = new Map<string, number>()
    for (const e of esforcos) {
      effortsMap.set(makeEffortKey(e.criterioId, e.complexidadeId, e.componenteId), e.valorEsforco)
    }

    // 5. Build AI request
    const criteriosParaIA: CriterioParaIA[] = criteriosDB.map(c => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      complexidades: c.complexidades.map(cx => ({
        id: cx.id,
        nome: cx.nome,
        descricao: cx.descricao,
        ordem: cx.ordem,
      })),
    }))

    // 6. Call AI provider
    const provider = getAIProvider()
    const analise = await provider.analyze({
      titulo: solicitacao.titulo,
      descricao: solicitacao.descricao,
      contexto: solicitacao.contexto ?? undefined,
      areaNome: solicitacao.area.nome,
      criterios: criteriosParaIA,
      componentes: componentesParaIA.length > 0 ? componentesParaIA : undefined,
    })

    console.log(`[analisar] IA retornou ${analise.criteriosSugeridos.length} critérios para solicitação ${id}`)

    // 7. Delete existing criterios for this solicitacao
    await prisma.solicitacaoCriterio.deleteMany({
      where: { solicitacaoId: id },
    })

    // 8. Create new SolicitacaoCriterio records
    let esforcoTotal = 0
    const criteriosCriados = []

    for (const sugestao of analise.criteriosSugeridos) {
      // Try with componenteId first, then fallback to null (generic effort)
      const valorEsforco =
        effortsMap.get(makeEffortKey(sugestao.criterioId, sugestao.complexidadeId, sugestao.componenteId)) ??
        effortsMap.get(makeEffortKey(sugestao.criterioId, sugestao.complexidadeId, null)) ??
        0

      try {
        const record = await prisma.solicitacaoCriterio.create({
          data: {
            solicitacaoId: id,
            criterioId: sugestao.criterioId,
            complexidadeId: sugestao.complexidadeId,
            componenteId: sugestao.componenteId ?? null,
            valorEsforco,
            fonte: 'IA',
            justificativa: sugestao.justificativa,
            confianca: sugestao.confianca,
          },
          include: {
            criterio: { select: { id: true, nome: true } },
            complexidade: { select: { id: true, nome: true } },
            componente: { select: { id: true, nome: true } },
          },
        })

        esforcoTotal += valorEsforco
        criteriosCriados.push(record)
      } catch (createError) {
        // Log but continue with remaining criteria (e.g. duplicate key)
        console.warn(
          `[analisar] Falha ao criar critério ${sugestao.criterioNome} (componente: ${sugestao.componenteNome ?? 'null'}):`,
          createError instanceof Error ? createError.message : createError
        )
      }
    }

    // 9. Update solicitacao
    await prisma.solicitacao.update({
      where: { id },
      data: {
        esforcoTotal,
        status: 'ESTIMADO',
      },
    })

    // 10. Audit
    await logAudit({
      entidade: 'Solicitacao',
      entidadeId: id,
      acao: 'ANALISE_IA',
      dadosNovos: {
        esforcoTotal,
        criteriosCount: criteriosCriados.length,
        confiancaGeral: analise.confiancaGeral,
      },
    })

    return NextResponse.json({
      analise: {
        observacoes: analise.observacoes,
        confiancaGeral: analise.confiancaGeral,
      },
      criterios: criteriosCriados,
      esforcoTotal,
    })
  } catch (error) {
    console.error('[POST /api/solicitacoes/[id]/analisar]', error)
    return NextResponse.json({ error: 'Erro ao analisar solicitação' }, { status: 500 })
  }
}
