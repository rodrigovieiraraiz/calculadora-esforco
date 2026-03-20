'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge'

const GAIN_TYPE_LABELS: Record<string, string> = {
  REDUCAO_CUSTO: 'Redução de Custo',
  AUMENTO_RECEITA: 'Aumento de Receita',
  REDUCAO_HORAS: 'Redução de Horas',
}

const BACKLOG_STATUSES = ['NAO_INICIADO', 'PRIORIZADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']

interface AuditLog {
  id: string
  entidade: string
  entidadeId: string
  acao: string
  dadosAnteriores: string | null
  dadosNovos: string | null
  usuario: string | null
  createdAt: string
}

export default function BacklogDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [backlogItem, setBacklogItem] = useState<any>(null)
  const [solicitacao, setSolicitacao] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [allBacklogCount, setAllBacklogCount] = useState(0)
  const [posicaoRanking, setPosicaoRanking] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isViewer, setIsViewer] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const biRes = await fetch(`/api/backlog/${id}`)
      if (!biRes.ok) { setLoading(false); return }
      const bi = await biRes.json()
      setBacklogItem(bi)
      setNewStatus(bi.status)

      const [solRes, auditRes, allRes] = await Promise.all([
        fetch(`/api/solicitacoes/${bi.solicitacaoId}`),
        fetch(`/api/audit-logs?entidade=Solicitacao&entidadeId=${bi.solicitacaoId}`),
        fetch('/api/backlog'),
      ])

      if (solRes.ok) setSolicitacao(await solRes.json())
      if (auditRes.ok) setAuditLogs(await auditRes.json())
      if (allRes.ok) {
        const all = await allRes.json()
        if (Array.isArray(all)) {
          setAllBacklogCount(all.length)
          const sorted = [...all].sort((a, b) => b.scorePriorizacao - a.scorePriorizacao)
          const idx = sorted.findIndex((item) => item.id === id)
          if (idx !== -1) setPosicaoRanking(idx + 1)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.role === 'VIEWER') setIsViewer(true) })
      .catch(() => {})
  }, [])

  const handleStatusUpdate = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/backlog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        setBacklogItem(updated)
        setMessage({ type: 'success', text: 'Status atualizado com sucesso' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Erro ao atualizar' })
      }
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const formatNumber = (n: number) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n)
  }

  const posicao = posicaoRanking ?? '-'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!backlogItem) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Item não encontrado</p>
        <button onClick={() => router.push('/backlog')} className="mt-4 text-teal-600 dark:text-teal-400 hover:underline">
          Voltar ao Backlog
        </button>
      </div>
    )
  }

  const sol = solicitacao || backlogItem.solicitacao

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/backlog')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm flex items-center gap-1"
        >
          ← Voltar ao Backlog
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{sol?.titulo}</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Info Geral */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informações Gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Área</p>
            <p className="font-medium dark:text-white">{sol?.area?.nome}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
            <StatusBadge status={backlogItem.status} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Urgência</p>
            <p className="font-medium dark:text-white">{sol?.urgencia || 'Não informada'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Criado em</p>
            <p className="font-medium dark:text-white">{formatDate(sol?.createdAt)}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Descrição</p>
            <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{sol?.descricao}</p>
          </div>
          {sol?.contexto && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Contexto</p>
              <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{sol.contexto}</p>
            </div>
          )}
        </div>
      </div>

      {/* Memória de Cálculo */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Memória de Cálculo</h2>
        {sol?.criterios && sol.criterios.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Componente</th>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Critério</th>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Complexidade</th>
                  <th className="text-right p-3 font-medium text-gray-600 dark:text-gray-400">Esforço (h)</th>
                  <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Fonte</th>
                  <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Confiança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sol.criterios.map((c: any) => (
                  <tr
                    key={c.id}
                    className={c.fonte === 'IA' ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-green-400'}
                  >
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      {c.componente?.nome ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                          {c.componente.nome}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-900 dark:text-white">{c.criterio?.nome}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{c.complexidade?.nome}</td>
                    <td className="p-3 text-right font-mono text-gray-900 dark:text-white">{c.valorEsforco}</td>
                    <td className="p-3 text-center"><SourceBadge source={c.fonte} /></td>
                    <td className="p-3 text-center">
                      {c.confianca != null ? <ConfidenceBadge confidence={c.confianca} /> : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-bold">
                <tr>
                  <td className="p-3 text-gray-900 dark:text-white" colSpan={3}>Total</td>
                  <td className="p-3 text-right font-mono text-gray-900 dark:text-white">{sol.esforcoTotal} h</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Nenhum critério registrado</p>
        )}
      </div>

      {/* Ganho Esperado + Score */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ganho Esperado</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tipo de Ganho</p>
              <p className="font-medium dark:text-white">{GAIN_TYPE_LABELS[backlogItem.tipoGanho] || backlogItem.tipoGanho}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valor</p>
              <p className="font-medium text-lg dark:text-white">
                {backlogItem.unidadeGanho === 'R$' ? 'R$ ' : ''}
                {formatNumber(backlogItem.valorGanho)}
                {backlogItem.unidadeGanho !== 'R$' ? ` ${backlogItem.unidadeGanho}` : ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ganho Normalizado</p>
              <p className="font-medium dark:text-white">{formatNumber(backlogItem.ganhoNormalizado)}</p>
            </div>
            {backlogItem.descricaoPremissa && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Premissa</p>
                <p className="text-gray-700 dark:text-gray-300">{backlogItem.descricaoPremissa}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Score de Priorização</h2>
          <p className="text-5xl font-bold text-teal-600 dark:text-teal-400">{formatNumber(backlogItem.scorePriorizacao)}</p>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Posição no Ranking</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">#{posicao}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">de {allBacklogCount} demandas</p>
          </div>
        </div>
      </div>

      {/* Alterar Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alterar Status</h2>
        <div className="flex items-center gap-4">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={isViewer}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {BACKLOG_STATUSES.map(s => (
              <option key={s} value={s}>
                {s === 'NAO_INICIADO' ? 'Não Iniciado' :
                 s === 'PRIORIZADO' ? 'Priorizado' :
                 s === 'EM_ANDAMENTO' ? 'Em Andamento' :
                 s === 'CONCLUIDO' ? 'Concluído' : 'Cancelado'}
              </option>
            ))}
          </select>
          <button
            onClick={handleStatusUpdate}
            disabled={isViewer || saving || newStatus === backlogItem.status}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Histórico de Auditoria */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Histórico de Auditoria</h2>
        {auditLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Data/Hora</th>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Ação</th>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatDate(log.createdAt)}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {log.acao}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{log.usuario || 'sistema'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhum registro de auditoria</p>
        )}
      </div>
    </div>
  )
}
