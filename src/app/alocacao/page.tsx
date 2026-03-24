'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAreaColor, getAreaTextColor } from '@/lib/alocacao-colors'

interface Funcionario {
  id: string
  nome: string
  cargo: string | null
  ativo: boolean
}

interface BacklogItemRef {
  id: string
  solicitacao: {
    titulo: string
    areaSolicitante: string | null
    area: { nome: string }
  }
}

interface Alocacao {
  id: string
  funcionarioId: string
  backlogItemId: string | null
  titulo: string
  dataInicio: string
  dataFim: string
  areaSolicitante: string | null
  cor: string | null
  funcionario: { id: string; nome: string; cargo: string | null }
  backlogItem?: BacklogItemRef | null
}

interface FormData {
  funcionarioId: string
  backlogItemId: string
  titulo: string
  dataInicio: string
  dataFim: string
  areaSolicitante: string
  cor: string
}

function nextBusinessDay(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  if (day === 6) d.setDate(d.getDate() + 2)
  else if (day === 0) d.setDate(d.getDate() + 1)
  return d
}

function countBusinessDays(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endNorm = new Date(end)
  endNorm.setHours(0, 0, 0, 0)
  while (cur <= endNorm) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(date)
  let remaining = days
  while (remaining > 0) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) remaining--
  }
  return d
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

function formatWeekLabel(start: Date): string {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const startStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const endStr = end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${startStr}–${endStr}`
}

function formatPeriodLabel(start: Date, end: Date): string {
  const startLabel = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const endLabel = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

function dateToInput(d: Date): string {
  return d.toISOString().split('T')[0]
}

function overlapsWeek(alocacao: Alocacao, weekStart: Date): boolean {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  const aStart = new Date(alocacao.dataInicio)
  const aEnd = new Date(alocacao.dataFim)
  return aStart <= weekEnd && aEnd >= weekStart
}

const WEEKS_WINDOW = 8

const emptyForm: FormData = {
  funcionarioId: '',
  backlogItemId: '',
  titulo: '',
  dataInicio: '',
  dataFim: '',
  areaSolicitante: '',
  cor: '',
}

export default function AlocacaoPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([])
  const [backlogItems, setBacklogItems] = useState<BacklogItemRef[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [windowStart, setWindowStart] = useState<Date>(() => startOfWeek(new Date()))
  const weeks = Array.from({ length: WEEKS_WINDOW }, (_, i) => addWeeks(windowStart, i))

  const [showModal, setShowModal] = useState(false)
  const [editAlocacao, setEditAlocacao] = useState<Alocacao | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }
  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 5000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const periodStart = weeks[0]
      const periodEnd = addWeeks(weeks[WEEKS_WINDOW - 1], 1)

      const [fRes, aRes, bRes] = await Promise.all([
        fetch('/api/funcionarios'),
        fetch(`/api/alocacoes?dataInicio=${dateToInput(periodStart)}&dataFim=${dateToInput(periodEnd)}`),
        fetch('/api/backlog'),
      ])

      const [fJson, aJson, bJson] = await Promise.all([fRes.json(), aRes.json(), bRes.json()])

      setFuncionarios(Array.isArray(fJson) ? fJson.filter((f: Funcionario) => f.ativo) : [])
      setAlocacoes(Array.isArray(aJson) ? aJson : [])
      setBacklogItems(Array.isArray(bJson) ? bJson : [])
    } catch {
      showError('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [windowStart]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role === 'ADMIN') setIsAdmin(true)
      })
      .catch(() => {})
  }, [fetchData])

  const openCreate = (funcionarioId?: string, weekStart?: Date) => {
    const fi = funcionarioId ?? ''
    const ds = weekStart ? dateToInput(weekStart) : ''
    const de = weekStart ? dateToInput(new Date(weekStart.getTime() + 6 * 86400000)) : ''
    setEditAlocacao(null)
    setForm({ ...emptyForm, funcionarioId: fi, dataInicio: ds, dataFim: de })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (alocacao: Alocacao) => {
    setEditAlocacao(alocacao)
    setForm({
      funcionarioId: alocacao.funcionarioId,
      backlogItemId: alocacao.backlogItemId ?? '',
      titulo: alocacao.titulo,
      dataInicio: dateToInput(new Date(alocacao.dataInicio)),
      dataFim: dateToInput(new Date(alocacao.dataFim)),
      areaSolicitante: alocacao.areaSolicitante ?? '',
      cor: alocacao.cor ?? '',
    })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditAlocacao(null)
    setForm(emptyForm)
    setFormError('')
  }

  const handleBacklogSelect = (backlogItemId: string) => {
    const item = backlogItems.find((b) => b.id === backlogItemId)
    if (item) {
      setForm((f) => ({
        ...f,
        backlogItemId,
        titulo: item.solicitacao.titulo,
        areaSolicitante: item.solicitacao.areaSolicitante ?? item.solicitacao.area.nome,
      }))
    } else {
      setForm((f) => ({ ...f, backlogItemId }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.funcionarioId) { setFormError('Selecione um funcionário.'); return }
    if (!form.titulo.trim()) { setFormError('Título é obrigatório.'); return }
    if (!form.dataInicio || !form.dataFim) { setFormError('Datas são obrigatórias.'); return }
    if (new Date(form.dataInicio) > new Date(form.dataFim)) { setFormError('Data início deve ser anterior à data fim.'); return }

    setSubmitting(true)
    setFormError('')
    try {
      const url = editAlocacao ? `/api/alocacoes/${editAlocacao.id}` : '/api/alocacoes'
      const method = editAlocacao ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funcionarioId: form.funcionarioId,
          backlogItemId: form.backlogItemId || null,
          titulo: form.titulo.trim(),
          dataInicio: form.dataInicio,
          dataFim: form.dataFim,
          areaSolicitante: form.areaSolicitante.trim() || null,
          cor: form.cor.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setFormError(json.error ?? 'Erro ao salvar.'); return }
      closeModal()
      await fetchData()
      showSuccess(editAlocacao ? 'Alocação atualizada com sucesso.' : 'Alocação criada com sucesso.')
    } catch {
      setFormError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/alocacoes/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao excluir.'); return }
      setDeleteConfirm(null)
      closeModal()
      await fetchData()
      showSuccess('Alocação excluída com sucesso.')
    } catch {
      showError('Erro de conexão.')
    }
  }

  const getAlocacoesForCell = (funcionarioId: string, weekStart: Date): Alocacao[] => {
    return alocacoes.filter(
      (a) => a.funcionarioId === funcionarioId && overlapsWeek(a, weekStart)
    )
  }

  const periodEnd = addWeeks(weeks[WEEKS_WINDOW - 1], 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Alocação de Time</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Visualize e gerencie a alocação semanal do time.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Alocação
          </button>
        )}
      </div>

      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-300">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Period navigation */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 shadow-sm">
        <button
          onClick={() => setWindowStart((d) => addWeeks(d, -WEEKS_WINDOW))}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
          aria-label="Período anterior"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {formatPeriodLabel(weeks[0], periodEnd)}
        </span>
        <button
          onClick={() => setWindowStart((d) => addWeeks(d, WEEKS_WINDOW))}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
          aria-label="Próximo período"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Timeline — desktop only, scrollable */}
      <div className="hidden md:block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
            <svg className="mr-2 h-4 w-4 animate-spin text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando...
          </div>
        ) : funcionarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="mb-3 h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">Nenhum funcionário ativo cadastrado.</p>
            <a href="/alocacao/funcionarios" className="mt-3 text-sm text-teal-600 hover:underline">
              Cadastrar funcionários
            </a>
          </div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700/50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 min-w-[180px]">
                  Funcionário
                </th>
                {weeks.map((w, i) => (
                  <th
                    key={i}
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[110px] border-l border-gray-100 dark:border-gray-700"
                  >
                    {formatWeekLabel(w)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {funcionarios.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                  <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-3 border-r border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{f.nome}</p>
                    {f.cargo && <p className="text-xs text-gray-500 dark:text-gray-400">{f.cargo}</p>}
                  </td>
                  {weeks.map((w, i) => {
                    const cellAlocacoes = getAlocacoesForCell(f.id, w)

                    return (
                      <td
                        key={i}
                        className="px-2 py-2 border-l border-gray-100 dark:border-gray-700 align-top"
                        style={{ minWidth: '110px' }}
                      >
                        <div className="flex flex-col gap-1">
                          {cellAlocacoes.map((alocacao) => {
                            const bgColor = getAreaColor(alocacao.areaSolicitante, alocacao.cor)
                            const textColor = getAreaTextColor(bgColor)
                            return (
                              <button
                                key={alocacao.id}
                                onClick={() => isAdmin && openEdit(alocacao)}
                                title={alocacao.titulo}
                                className="w-full rounded px-2 py-1.5 text-xs font-medium text-left transition-opacity hover:opacity-80"
                                style={{ backgroundColor: bgColor, color: textColor }}
                              >
                                <span className="block truncate">{alocacao.titulo}</span>
                                {alocacao.areaSolicitante && (
                                  <span className="block truncate opacity-80 text-xs">{alocacao.areaSolicitante}</span>
                                )}
                              </button>
                            )
                          })}
                          {isAdmin && (
                            <button
                              onClick={() => openCreate(f.id, w)}
                              className="w-full rounded border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600 hover:border-teal-400 dark:hover:border-teal-600 hover:text-teal-400 dark:hover:text-teal-600 transition-colors text-lg leading-none py-1"
                              title="Adicionar alocação"
                              aria-label={`Adicionar alocação para ${f.nome} na semana ${formatWeekLabel(w)}`}
                            >
                              +
                            </button>
                          )}
                          {!isAdmin && cellAlocacoes.length === 0 && (
                            <div className="w-full h-10 rounded bg-gray-50 dark:bg-gray-700/30" />
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
            <svg className="mr-2 h-4 w-4 animate-spin text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando...
          </div>
        ) : funcionarios.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Nenhum funcionário ativo cadastrado.</div>
        ) : (
          funcionarios.map((f) => {
            const fAlocacoes = alocacoes.filter((a) => a.funcionarioId === f.id)
            return (
              <div key={f.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{f.nome}</p>
                  {f.cargo && <p className="text-xs text-gray-500 dark:text-gray-400">{f.cargo}</p>}
                </div>
                {fAlocacoes.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-gray-400">
                    Sem alocações no período.
                    {isAdmin && (
                      <button onClick={() => openCreate(f.id)} className="ml-2 text-teal-600 hover:underline">Adicionar</button>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {fAlocacoes.map((a) => {
                      const bgColor = getAreaColor(a.areaSolicitante, a.cor)
                      const textColor = getAreaTextColor(bgColor)
                      return (
                        <li key={a.id} className="px-4 py-3 flex items-start gap-3">
                          <div
                            className="mt-0.5 w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: bgColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.titulo}</p>
                            {a.areaSolicitante && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{a.areaSolicitante}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(a.dataInicio).toLocaleDateString('pt-BR')} – {new Date(a.dataFim).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => openEdit(a)}
                              className="shrink-0 text-xs text-blue-600 hover:underline"
                            >
                              Editar
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 shadow-xl max-h-[90vh] flex flex-col">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editAlocacao ? 'Editar Alocação' : 'Nova Alocação'}
              </h2>
              {editAlocacao && (
                <button
                  onClick={() => setDeleteConfirm(editAlocacao.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Excluir
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-y-auto">
              <div className="space-y-4 px-6 py-4">
                {formError && (
                  <div className="rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 text-sm text-red-700 dark:text-red-300">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Funcionário <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.funcionarioId}
                    onChange={(e) => setForm((f) => ({ ...f, funcionarioId: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Selecione...</option>
                    {funcionarios.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}{f.cargo ? ` — ${f.cargo}` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Backlog Item (opcional)
                  </label>
                  <select
                    value={form.backlogItemId}
                    onChange={(e) => handleBacklogSelect(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Nenhum (alocação livre)</option>
                    {backlogItems.map((b) => (
                      <option key={b.id} value={b.id}>{b.solicitacao.titulo}</option>
                    ))}
                  </select>
                  {form.backlogItemId && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Título e área serão preenchidos automaticamente.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Título / Projeto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Nome da demanda ou projeto"
                    maxLength={200}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Data Início <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.dataInicio}
                      onChange={(e) => {
                        const rawValue = e.target.value
                        if (!rawValue) {
                          setForm((f) => ({ ...f, dataInicio: rawValue }))
                          return
                        }
                        const newStart = nextBusinessDay(new Date(rawValue + 'T12:00:00'))
                        const newStartStr = dateToInput(newStart)
                        setForm((f) => {
                          if (f.dataFim && f.dataInicio) {
                            const oldStart = new Date(f.dataInicio + 'T12:00:00')
                            const oldEnd = new Date(f.dataFim + 'T12:00:00')
                            const businessDays = countBusinessDays(oldStart, oldEnd)
                            const newEnd = businessDays > 1
                              ? addBusinessDays(newStart, businessDays - 1)
                              : newStart
                            return { ...f, dataInicio: newStartStr, dataFim: dateToInput(newEnd) }
                          }
                          return { ...f, dataInicio: newStartStr, dataFim: f.dataFim || newStartStr }
                        })
                      }}
                      className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Data Fim <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.dataFim}
                      onChange={(e) => {
                        const rawValue = e.target.value
                        if (!rawValue) {
                          setForm((f) => ({ ...f, dataFim: rawValue }))
                          return
                        }
                        const adjustedEnd = nextBusinessDay(new Date(rawValue + 'T12:00:00'))
                        setForm((f) => ({ ...f, dataFim: dateToInput(adjustedEnd) }))
                      }}
                      className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Área Solicitante
                  </label>
                  <input
                    type="text"
                    value={form.areaSolicitante}
                    onChange={(e) => setForm((f) => ({ ...f, areaSolicitante: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Ex: TI, RH, Financeiro..."
                    maxLength={100}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Define a cor da célula no cronograma.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cor personalizada
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      value={form.cor || '#6b7280'}
                      onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                      className="h-9 w-14 rounded border border-gray-300 dark:border-gray-600 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Usado apenas se nenhuma área for informada.
                    </span>
                    {form.cor && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, cor: '' }))}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting && (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {editAlocacao ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar exclusão</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja excluir esta alocação? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
