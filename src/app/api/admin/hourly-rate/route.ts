import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, AuthError } from '@/lib/auth'
import { logAudit } from '@/lib/services/audit'
import { DEFAULT_VALOR_HORA } from '@/lib/config/gain-weights'

export async function GET() {
  try {
    const config = await prisma.hourlyRateConfig.findFirst()
    return NextResponse.json({ valorHora: config?.valorHora ?? DEFAULT_VALOR_HORA })
  } catch (error) {
    console.error('[GET /api/admin/hourly-rate]', error)
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { valorHora } = body

    if (valorHora === undefined || valorHora === null || typeof valorHora !== 'number' || valorHora <= 0) {
      return NextResponse.json({ error: 'valorHora deve ser um número positivo' }, { status: 400 })
    }

    const existing = await prisma.hourlyRateConfig.findFirst()

    let config
    if (existing) {
      config = await prisma.hourlyRateConfig.update({
        where: { id: existing.id },
        data: { valorHora },
      })
    } else {
      config = await prisma.hourlyRateConfig.create({
        data: { valorHora },
      })
    }

    await logAudit({
      entidade: 'HourlyRateConfig',
      entidadeId: config.id,
      acao: existing ? 'UPDATE' : 'CREATE',
      dadosAnteriores: existing ? { valorHora: existing.valorHora } : undefined,
      dadosNovos: { valorHora: config.valorHora },
      usuario: session.email,
    })

    return NextResponse.json({ valorHora: config.valorHora })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/admin/hourly-rate]', error)
    return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 })
  }
}
