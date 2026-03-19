import { prisma } from '@/lib/prisma'

export async function logAudit(params: {
  entidade: string
  entidadeId: string
  acao: string
  dadosAnteriores?: unknown
  dadosNovos?: unknown
  usuario?: string
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entidade: params.entidade,
        entidadeId: params.entidadeId,
        acao: params.acao,
        dadosAnteriores: params.dadosAnteriores ? JSON.stringify(params.dadosAnteriores) : null,
        dadosNovos: params.dadosNovos ? JSON.stringify(params.dadosNovos) : null,
        usuario: params.usuario ?? 'sistema',
      },
    })
  } catch (error) {
    console.error('[AUDIT] Falha ao registrar log de auditoria:', error)
  }
}
