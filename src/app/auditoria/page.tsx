'use client'

import { useState, useEffect, useCallback } from 'react'

interface AuditLog {
  id: string
  entidade: string
  entidadeId: string
  acao: string
  usuario: string | null
  dadosAnteriores: Record<string, unknown> | null
  dadosNovos: Record<string, unknown> | null
  createdAt: string
}

const ENTIDADES = [
  'Solicitacao',
  'BacklogItem',
  'User',
  'Area',
  'Criterio',
  'Complexidade',
  'Esforco',
]

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

function acaoBadge(acao: string) {
  const map: Record<string, string> = {
    CREATE: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
    UPDATE: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
    DELETE: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  }
  const cls = map[acao] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {acao}
    </span>
  )
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [error, setError] = useState('')

  // Filters
  const [filterEntidade, setFilterEntidade] = useState('')
  const [filterDe, setFilterDe] = useState('')
  const [filterAte, setFilterAte] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterEntidade) params.set('entidade', filterEntidade)
      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true)
        return
      }
      if (!res.ok) {
        setError('Erro ao carregar logs de auditoria.')
        return
      }
      const json = await res.json()
      setLogs(Array.isArray(json) ? json : [])
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }, [filterEntidade])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Client-side date filter (API doesn't support date range yet)
  const filteredLogs = logs.filter((log) => {
    const d = new Date(log.createdAt)
    if (filterDe) {
      const de = new Date(filterDe)
      de.setHours(0, 0, 0, 0)
      if (d < de) return false
    }
    if (filterAte) {
      const ate = new Date(filterAte)
      ate.setHours(23, 59, 59, 999)
      if (d > ate) return false
    }
    return true
  })

  const clearFilters = () => {
    setFilterEntidade('')
    setFilterDe('')
    setFilterAte('')
  }

  const hasFilters = filterEntidade || filterDe || filterAte

  if (unauthorized) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-6 text-center">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          Acesso negado. Você não tem permissão para acessar esta página.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Auditoria</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Registro de todas as ações realizadas no sistema.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="f-entidade" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Entidade
            </label>
            <select
              id="f-entidade"
              value={filterEntidade}
              onChange={(e) => setFilterEntidade(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Todas</option>
              {ENTIDADES.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-de" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              De
            </label>
            <input
              id="f-de"
              type="date"
              value={filterDe}
              onChange={(e) => setFilterDe(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label htmlFor="f-ate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Até
            </label>
            <input
              id="f-ate"
              type="date"
              value={filterAte}
              onChange={(e) => setFilterAte(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
        {hasFilters && (
          <div className="mt-2">
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
            <svg className="mr-2 h-4 w-4 animate-spin text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="mb-3 h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="text-sm">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 sm:hidden">
              {filteredLogs.map((log) => (
                <li key={log.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(log.createdAt)}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.entidade}
                        {log.entidadeId && (
                          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 font-mono">#{log.entidadeId.slice(0, 8)}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{log.usuario ?? '—'}</p>
                    </div>
                    {acaoBadge(log.acao)}
                  </div>
                  {(log.dadosAnteriores || log.dadosNovos) && (
                    <details>
                      <summary className="cursor-pointer text-xs text-teal-600 dark:text-teal-400 hover:underline select-none list-none">Ver detalhes</summary>
                      <div className="mt-2 space-y-2">
                        {log.dadosAnteriores && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Antes:</p>
                            <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">{JSON.stringify(log.dadosAnteriores, null, 2)}</pre>
                          </div>
                        )}
                        {log.dadosNovos && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Depois:</p>
                            <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">{JSON.stringify(log.dadosNovos, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Data/Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Usuário</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Entidade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ação</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 align-top">
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{log.usuario ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{log.entidade}</span>
                        {log.entidadeId && (
                          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 font-mono">#{log.entidadeId.slice(0, 8)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{acaoBadge(log.acao)}</td>
                      <td className="px-4 py-3 text-sm">
                        {(log.dadosAnteriores || log.dadosNovos) ? (
                          <details className="group">
                            <summary className="cursor-pointer text-xs text-teal-600 dark:text-teal-400 hover:underline select-none list-none">Ver detalhes</summary>
                            <div className="mt-2 space-y-2">
                              {log.dadosAnteriores && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Antes:</p>
                                  <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all max-w-xs">{JSON.stringify(log.dadosAnteriores, null, 2)}</pre>
                                </div>
                              )}
                              {log.dadosNovos && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Depois:</p>
                                  <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all max-w-xs">{JSON.stringify(log.dadosNovos, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          </details>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {!loading && filteredLogs.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
          {filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''} exibido{filteredLogs.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
