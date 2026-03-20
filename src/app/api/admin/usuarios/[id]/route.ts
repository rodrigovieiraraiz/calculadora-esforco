import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin, AuthError } from '@/lib/auth'
import { logAudit } from '@/lib/services/audit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { nome, role, ativo, senha } = body

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (role && !['ADMIN', 'OPERATOR', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (nome !== undefined) updateData.nome = nome
    if (role !== undefined) updateData.role = role
    if (ativo !== undefined) updateData.ativo = ativo
    if (senha) updateData.senha = await bcrypt.hash(senha, 10)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, nome: true, role: true, ativo: true, createdAt: true },
    })

    // If deactivated, delete all sessions
    if (ativo === false) {
      await prisma.session.deleteMany({ where: { userId: id } })
    }

    await logAudit({
      entidade: 'User',
      entidadeId: id,
      acao: 'UPDATE',
      dadosAnteriores: { nome: existing.nome, role: existing.role, ativo: existing.ativo },
      dadosNovos: updateData,
      usuario: session.email,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/admin/usuarios/[id]]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
