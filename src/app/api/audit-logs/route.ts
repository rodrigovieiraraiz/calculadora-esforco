import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entidade = searchParams.get('entidade')
    const entidadeId = searchParams.get('entidadeId')
    const limitParam = searchParams.get('limit')

    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 100

    const where: { entidade?: string; entidadeId?: string } = {}
    if (entidade) where.entidade = entidade
    if (entidadeId) where.entidadeId = entidadeId

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('[GET /api/audit-logs]', error)
    return NextResponse.json({ error: 'Erro ao listar logs de auditoria' }, { status: 500 })
  }
}
