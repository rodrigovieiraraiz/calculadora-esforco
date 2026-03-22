'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface Area {
  id: string
  nome: string
}

interface BacklogItem {
  id: string
  posicao: number
  tipoGanho: string
  valorGanho: number
  ganhoNormalizado: number
  scorePriorizacao: number
  status: string
  dataInicio: string | null
  previsaoConclusao: string | null
  solicitacao: {
    titulo: string
    esforcoTotal: number | null
    solicitante: string | null
    areaSolicitante: string | null
    area: {
      nome: string
    }
  }
}

type BacklogStatus = 'NAO_INICIADO' | 'PRIORIZADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO'

const GAIN_TYPE_LABELS: Record<string, string> = {
  REDUCAO_CUSTO: 'Redução de Custo',
  AUMENTO_RECEITA: 'Aumento de Receita',
  REDUCAO_HORAS: 'Redução de Horas',
}

const GAIN_WEIGHT_LABELS: Record<string, string> = {
  REDUCAO_CUSTO: 'Peso 1.0',
  AUMENTO_RECEITA: 'Peso 1.2',
  REDUCAO_HORAS: 'Peso 0.8',
}

const STATUS_OPTIONS: { value: BacklogStatus; label: string }[] = [
  { value: 'NAO_INICIADO', label: 'Não Iniciado' },
  { value: 'PRIORIZADO', label: 'Priorizado' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'CONCLUIDO', label: 'Concluído' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

const GAIN_OPTIONS = Object.entries(GAIN_TYPE_LABELS).map(([value, label]) => ({ value, label }))

const positionLabel = (pos: number) => {
  if (pos === 1) return '🥇'
  if (pos === 2) return '🥈'
  if (pos === 3) return '🥉'
  return String(pos)
}

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function toInputDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

export default function BacklogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<BacklogItem[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showFormula, setShowFormula] = useState(false)
  const [isViewer, setIsViewer] = useState(false)

  const [filterArea, setFilterArea] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTipoGanho, setFilterTipoGanho] = useState('')

  // Selection for batch operations
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBatchDelete, setShowBatchDelete] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<string>('')
  const [editDataInicio, setEditDataInicio] = useState('')
  const [editPrevisao, setEditPrevisao] = useState('')
  const [saving, setSaving] = useState(false)

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000) }

  const fetchBacklog = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterArea) params.set('areaId', filterArea)
      if (filterStatus) params.set('status', filterStatus)
      if (filterTipoGanho) params.set('tipoGanho', filterTipoGanho)

      const query = params.toString()
      const res = await fetch(`/api/backlog${query ? `?${query}` : ''}`)
      const json = await res.json()
      setItems(Array.isArray(json) ? json : [])
    } catch {
      showError('Erro ao carregar backlog.')
    } finally {
      setLoading(false)
    }
  }, [filterArea, filterStatus, filterTipoGanho])

  useEffect(() => {
    async function fetchAreas() {
      try {
        const res = await fetch('/api/areas?ativo=true')
        const json = await res.json()
        setAreas(Array.isArray(json) ? json : [])
      } catch { /* not critical */ }
    }
    fetchAreas()
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.role === 'VIEWER') setIsViewer(true) })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchBacklog() }, [fetchBacklog])

  const clearFilters = () => {
    setFilterArea('')
    setFilterStatus('')
    setFilterTipoGanho('')
  }

  const hasFilters = filterArea || filterStatus || filterTipoGanho

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((i) => i.id)))
  }

  const handleBatchDelete = async () => {
    setBatchDeleting(true)
    try {
      const res = await fetch('/api/backlog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao remover.'); return }
      setShowBatchDelete(false)
      setSelected(new Set())
      await fetchBacklog()
      showSuccess(json.message ?? 'Itens removidos.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setBatchDeleting(false)
    }
  }

  const startEditing = (item: BacklogItem) => {
    setEditingId(item.id)
    setEditStatus(item.status)
    setEditDataInicio(toInputDate(item.dataInicio))
    setEditPrevisao(toInputDate(item.previsaoConclusao))
  }

  const cancelEditing = () => {
    setEditingId(null)
  }

  const saveEditing = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/backlog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          dataInicio: editDataInicio || null,
          previsaoConclusao: editPrevisao || null,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        showError(json.error ?? 'Erro ao salvar.')
        return
      }
      setEditingId(null)
      await fetchBacklog()
      showSuccess('Item atualizado com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Backlog Priorizado</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Lista de demandas ordenadas por score de priorização.
        </p>
      </div>

      {/* Ranking Criteria Explainer */}
      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
        <button
          onClick={() => setShowFormula(!showFormula)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-700 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-teal-900 dark:text-teal-200">
              Como funciona o Score de Priorização?
            </span>
          </div>
          <svg className={`w-4 h-4 text-teal-700 dark:text-teal-400 transition-transform ${showFormula ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showFormula && (
          <div className="mt-3 space-y-3 text-sm text-teal-800 dark:text-teal-300">
            <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-teal-100 dark:border-teal-700">
              <p className="font-mono font-semibold text-center text-base">
                Score = Ganho Normalizado / Esforço Total (h)
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Ganho Normalizado = Valor do Ganho &times; Peso do Tipo</p>
              <ul className="ml-4 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                  Aumento de Receita: peso <strong>1.2</strong> (prioridade maior)
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                  Redução de Custo: peso <strong>1.0</strong> (referência)
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
                  Redução de Horas: peso <strong>0.8</strong>
                </li>
              </ul>
            </div>
            <p className="text-xs text-teal-700 dark:text-teal-400">
              Quanto maior o score, maior a relação ganho/esforço e mais prioritária a demanda.
              Demandas com score mais alto devem ser executadas primeiro.
            </p>
          </div>
        )}
      </div>

      {/* Banners */}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-300">{success}</div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300">{error}</div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="filter-area" className="text-xs font-medium text-gray-600 dark:text-gray-400">Área</label>
              <select id="filter-area" value={filterArea} onChange={(e) => setFilterArea(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Todas as áreas</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="filter-status" className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
              <select id="filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Todos os status</option>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="filter-tipo-ganho" className="text-xs font-medium text-gray-600 dark:text-gray-400">Tipo de Ganho</label>
              <select id="filter-tipo-ganho" value={filterTipoGanho} onChange={(e) => setFilterTipoGanho(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Todos os tipos</option>
                {GAIN_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
          {hasFilters && (
            <div className="flex">
              <button onClick={clearFilters}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Batch selection toolbar */}
      {selected.size > 0 && !isViewer && (
        <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-teal-900 dark:text-teal-200">
            {selected.size} {selected.size === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>
          <button onClick={() => setShowBatchDelete(true)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
            Remover selecionados
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-600 dark:text-gray-400 hover:underline">
            Limpar seleção
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="md" label="Carregando backlog..." />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-sm">Nenhum item encontrado no backlog.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-sm text-blue-600 hover:underline">Limpar filtros</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleSelectAll} disabled={isViewer} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Selecionar todos" />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">#</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Título</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Solicitante</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Área Solicitante</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Área Técnica</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Esforço</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Tipo Ganho</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Valor Ganho</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Score</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Início</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Previsão</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {items.map((item) => {
                  const isEditing = editingId === item.id
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-3 w-10">
                        <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} disabled={isViewer} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {positionLabel(item.posicao)}
                      </td>
                      <td
                        className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-[200px] truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => router.push(`/backlog/${item.id}`)}
                        title={item.solicitacao?.titulo}
                      >
                        {item.solicitacao?.titulo ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {item.solicitacao?.solicitante ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {item.solicitacao?.areaSolicitante ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {item.solicitacao?.area?.nome ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {item.solicitacao?.esforcoTotal != null ? `${item.solicitacao.esforcoTotal}h` : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div>
                          <span>{GAIN_TYPE_LABELS[item.tipoGanho] ?? item.tipoGanho}</span>
                          <span className="block text-xs text-gray-400 dark:text-gray-500">{GAIN_WEIGHT_LABELS[item.tipoGanho] ?? ''}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {item.valorGanho != null ? item.valorGanho.toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-base font-bold text-gray-900 dark:text-white" title={`Ganho Norm.: ${item.ganhoNormalizado?.toFixed(2) ?? '—'} / Esforço: ${item.solicitacao?.esforcoTotal ?? '—'}h`}>
                          {item.scorePriorizacao?.toFixed(2) ?? '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        ) : (
                          <StatusBadge status={item.status as Parameters<typeof StatusBadge>[0]['status']} />
                        )}
                      </td>

                      {/* Data Início */}
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDataInicio}
                            onChange={(e) => setEditDataInicio(e.target.value)}
                            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          formatDateBR(item.dataInicio)
                        )}
                      </td>

                      {/* Previsão Conclusão */}
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editPrevisao}
                            onChange={(e) => setEditPrevisao(e.target.value)}
                            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          formatDateBR(item.previsaoConclusao)
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => saveEditing(item.id)}
                              disabled={saving}
                              className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-50"
                            >
                              {saving ? '...' : 'Salvar'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditing(item) }}
                              disabled={isViewer}
                              className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => router.push(`/backlog/${item.id}`)}
                              className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Detalhes
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batch Delete Confirmation */}
      {showBatchDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar exclusão em lote</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja remover {selected.size} {selected.size === 1 ? 'item' : 'itens'} do backlog?
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button onClick={() => setShowBatchDelete(false)} disabled={batchDeleting} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={handleBatchDelete} disabled={batchDeleting} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {batchDeleting ? 'Removendo...' : `Remover ${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
