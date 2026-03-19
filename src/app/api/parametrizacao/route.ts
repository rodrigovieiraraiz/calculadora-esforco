import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, AuthError } from '@/lib/auth'
import { logAudit } from '@/lib/services/audit'

// GET: returns all criteria+complexidades+esforcos for an area, flattened
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const areaId = searchParams.get('areaId')
    if (!areaId) {
      return NextResponse.json({ error: 'areaId é obrigatório' }, { status: 400 })
    }

    const esforcos = await prisma.esforco.findMany({
      where: { ativo: true, criterio: { areaId, ativo: true } },
      include: {
        criterio: { select: { id: true, nome: true } },
        complexidade: { select: { id: true, nome: true, ordem: true } },
        componente: { select: { id: true, nome: true } },
      },
      orderBy: [
        { componente: { nome: 'asc' } },
        { criterio: { nome: 'asc' } },
        { complexidade: { ordem: 'asc' } },
      ],
    })

    const rows = esforcos.map((e) => ({
      criterioId: e.criterio.id,
      criterioNome: e.criterio.nome,
      complexidadeId: e.complexidade.id,
      complexidadeNome: e.complexidade.nome,
      complexidadeOrdem: e.complexidade.ordem,
      esforcoId: e.id,
      valorEsforco: e.valorEsforco,
      componenteId: e.componente?.id ?? null,
      componenteNome: e.componente?.nome ?? null,
    }))

    return NextResponse.json(rows)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[GET /api/parametrizacao]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST: create or update criterio + complexidade + esforco in one shot
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { areaId, criterioNome, complexidadeNome, valorEsforco, complexidadeOrdem, componenteId } = body

    if (!areaId || !criterioNome?.trim() || !complexidadeNome?.trim()) {
      return NextResponse.json(
        { error: 'Área, critério e complexidade são obrigatórios' },
        { status: 400 }
      )
    }

    if (valorEsforco === undefined || valorEsforco === null || Number(valorEsforco) < 0) {
      return NextResponse.json(
        { error: 'Valor do esforço deve ser um número positivo' },
        { status: 400 }
      )
    }

    // 1. Find or create Criterio
    let criterio = await prisma.criterio.findFirst({
      where: { areaId, nome: criterioNome.trim() },
    })
    if (!criterio) {
      criterio = await prisma.criterio.create({
        data: { areaId, nome: criterioNome.trim() },
      })
    }

    // 2. Find or create Complexidade
    let complexidade = await prisma.complexidade.findFirst({
      where: { criterioId: criterio.id, nome: complexidadeNome.trim() },
    })
    if (!complexidade) {
      complexidade = await prisma.complexidade.create({
        data: {
          criterioId: criterio.id,
          nome: complexidadeNome.trim(),
          ordem: Number(complexidadeOrdem) || 0,
        },
      })
    }

    // 3. Upsert Esforco (unique by criterio+complexidade+componente)
    const existingEsforco = await prisma.esforco.findFirst({
      where: {
        criterioId: criterio.id,
        complexidadeId: complexidade.id,
        componenteId: componenteId || null,
      },
    })

    let esforco
    if (existingEsforco) {
      esforco = await prisma.esforco.update({
        where: { id: existingEsforco.id },
        data: { valorEsforco: Number(valorEsforco), ativo: true },
      })
    } else {
      esforco = await prisma.esforco.create({
        data: {
          criterioId: criterio.id,
          complexidadeId: complexidade.id,
          componenteId: componenteId || null,
          valorEsforco: Number(valorEsforco),
          unidadeEsforco: 'horas',
        },
      })
    }

    await logAudit({
      entidade: 'Parametrizacao',
      entidadeId: esforco.id,
      acao: existingEsforco ? 'UPDATE' : 'CREATE',
      dadosNovos: {
        criterio: criterio.nome,
        complexidade: complexidade.nome,
        valorEsforco: esforco.valorEsforco,
        componenteId: componenteId || null,
      },
      usuario: session.email,
    })

    return NextResponse.json({
      criterioId: criterio.id,
      criterioNome: criterio.nome,
      complexidadeId: complexidade.id,
      complexidadeNome: complexidade.nome,
      complexidadeOrdem: complexidade.ordem,
      esforcoId: esforco.id,
      valorEsforco: esforco.valorEsforco,
      componenteId: componenteId || null,
    }, { status: existingEsforco ? 200 : 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/parametrizacao]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE: remove esforcos (and orphaned complexidades/criterios)
// Accepts { items: [{ criterioId, complexidadeId }, ...] } for batch delete
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()

    // Support single item or batch
    const items: { criterioId: string; complexidadeId: string; componenteId?: string | null }[] = body.items ?? [body]

    if (!items.length || !items[0].criterioId) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    let removedCount = 0
    for (const { criterioId, complexidadeId, componenteId } of items) {
      if (!criterioId || !complexidadeId) continue

      // Remove references in SolicitacaoCriterio first
      await prisma.solicitacaoCriterio.deleteMany({
        where: { criterioId, complexidadeId },
      })

      // Delete esforco (matching componenteId)
      await prisma.esforco.deleteMany({
        where: { criterioId, complexidadeId, componenteId: componenteId ?? null },
      })

      // Delete complexidade if orphaned
      const remainingEsforcos = await prisma.esforco.count({ where: { complexidadeId } })
      if (remainingEsforcos === 0) {
        const refsInSolicitations = await prisma.solicitacaoCriterio.count({ where: { complexidadeId } })
        if (refsInSolicitations === 0) {
          await prisma.complexidade.delete({ where: { id: complexidadeId } }).catch(() => {})
        }
      }

      // Delete criterio if orphaned
      const remainingComplexidades = await prisma.complexidade.count({ where: { criterioId } })
      if (remainingComplexidades === 0) {
        const refsInSolicitations = await prisma.solicitacaoCriterio.count({ where: { criterioId } })
        if (refsInSolicitations === 0) {
          await prisma.criterio.delete({ where: { id: criterioId } }).catch(() => {})
        }
      }

      removedCount++
    }

    await logAudit({
      entidade: 'Parametrizacao',
      entidadeId: items.map(i => i.complexidadeId).join(','),
      acao: 'DELETE',
      dadosAnteriores: { count: removedCount, items },
      usuario: session.email,
    })

    return NextResponse.json({ message: `${removedCount} registro(s) removido(s)` })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/parametrizacao]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT: rename a criterio
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { criterioId, nome } = body

    if (!criterioId || !nome?.trim()) {
      return NextResponse.json({ error: 'criterioId e nome são obrigatórios' }, { status: 400 })
    }

    const existing = await prisma.criterio.findUnique({ where: { id: criterioId } })
    if (!existing) {
      return NextResponse.json({ error: 'Critério não encontrado' }, { status: 404 })
    }

    const updated = await prisma.criterio.update({
      where: { id: criterioId },
      data: { nome: nome.trim() },
    })

    await logAudit({
      entidade: 'Criterio',
      entidadeId: criterioId,
      acao: 'UPDATE',
      dadosAnteriores: { nome: existing.nome },
      dadosNovos: { nome: updated.nome },
      usuario: session.email,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/parametrizacao]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
