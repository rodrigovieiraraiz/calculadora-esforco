'use client'

import { useState, useEffect, useCallback } from 'react'

interface Area {
  id: string
  nome: string
}

interface Criterio {
  id: string
  nome: string
  areaId: string
}

interface Complexidade {
  id: string
  nome: string
  criterioId: string
  ordem: number
}

interface Esforco {
  id: string
  criterioId: string
  complexidadeId: string
  valorEsforco: number
  unidadeEsforco: string
  observacao: string | null
  ativo: boolean
  criterio: { nome: string }
  complexidade: { nome: string }
}

interface FormData {
  criterioId: string
  complexidadeId: string
  valorEsforco: string
  unidadeEsforco: string
  observacao: string
}

const emptyForm: FormData = {
  criterioId: '',
  complexidadeId: '',
  valorEsforco: '',
  unidadeEsforco: 'horas',
  observacao: '',
}

export default function EsforcosPage() {
  const [esforcos, setEsforcos] = useState<Esforco[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [filterAreaId, setFilterAreaId] = useState('')
  const [filterCriterioId, setFilterCriterioId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Esforco | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [formCriterios, setFormCriterios] = useState<Criterio[]>([])
  const [formComplexidades, setFormComplexidades] = useState<Complexidade[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000) }

  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch('/api/areas?ativo=true')
      const json = await res.json()
      setAreas(Array.isArray(json) ? json : [])
    } catch { /* silent */ }
  }, [])

  const fetchCriteriosByArea = useCallback(async (areaId: string): Promise<Criterio[]> => {
    if (!areaId) return []
    try {
      const res = await fetch(`/api/criterios?areaId=${areaId}&ativo=true`)
      const json = await res.json()
      return Array.isArray(json) ? json : []
    } catch { return [] }
  }, [])

  const fetchComplexidadesByCriterio = useCallback(async (criterioId: string): Promise<Complexidade[]> => {
    if (!criterioId) return []
    try {
      const res = await fetch(`/api/complexidades?criterioId=${criterioId}&ativo=true`)
      const json = await res.json()
      return Array.isArray(json) ? json : []
    } catch { return [] }
  }, [])

  const fetchEsforcos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCriterioId) params.set('criterioId', filterCriterioId)
      const res = await fetch(`/api/esforcos?${params.toString()}`)
      const json = await res.json()
      setEsforcos(Array.isArray(json) ? json : [])
    } catch {
      showError('Erro ao carregar esforços.')
    } finally {
      setLoading(false)
    }
  }, [filterCriterioId])

  useEffect(() => { fetchAreas() }, [fetchAreas])
  useEffect(() => { fetchEsforcos() }, [fetchEsforcos])

  // Filter: area change -> load criterios
  useEffect(() => {
    if (filterAreaId) {
      fetchCriteriosByArea(filterAreaId).then(setCriterios)
    } else {
      setCriterios([])
      setFilterCriterioId('')
    }
  }, [filterAreaId, fetchCriteriosByArea])

  // Filter: keep criterio in sync with area
  useEffect(() => {
    if (filterCriterioId && criterios.length > 0) {
      const exists = criterios.find((c) => c.id === filterCriterioId)
      if (!exists) setFilterCriterioId('')
    }
  }, [criterios, filterCriterioId])

  // Form: when form criterioId changes, load complexidades
  const handleFormCriterioChange = async (criterioId: string) => {
    setForm((f) => ({ ...f, criterioId, complexidadeId: '' }))
    const list = await fetchComplexidadesByCriterio(criterioId)
    setFormComplexidades(list)
  }

  // Form: when form area changes, load criterios cascade
  const handleFormAreaChange = async (areaId: string) => {
    const list = await fetchCriteriosByArea(areaId)
    setFormCriterios(list)
    setFormComplexidades([])
    setForm((f) => ({ ...f, criterioId: '', complexidadeId: '' }))
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ ...emptyForm, criterioId: filterCriterioId })
    setFormError('')
    setFormComplexidades([])
    if (filterAreaId) {
      fetchCriteriosByArea(filterAreaId).then(setFormCriterios)
    } else {
      setFormCriterios([])
    }
    if (filterCriterioId) {
      fetchComplexidadesByCriterio(filterCriterioId).then(setFormComplexidades)
    }
    setShowForm(true)
  }

  const openEdit = async (item: Esforco) => {
    setEditItem(item)
    setForm({
      criterioId: item.criterioId,
      complexidadeId: item.complexidadeId,
      valorEsforco: String(item.valorEsforco),
      unidadeEsforco: item.unidadeEsforco || 'horas',
      observacao: item.observacao ?? '',
    })
    setFormError('')
    // Load all criterios and complexidades for editing
    try {
      const [cRes, compRes] = await Promise.all([
        fetch('/api/criterios?ativo=true'),
        fetch(`/api/complexidades?criterioId=${item.criterioId}&ativo=true`),
      ])
      const cJson = await cRes.json()
      const compJson = await compRes.json()
      setFormCriterios(Array.isArray(cJson) ? cJson : [])
      setFormComplexidades(Array.isArray(compJson) ? compJson : [])
    } catch {
      setFormCriterios([])
      setFormComplexidades([])
    }
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditItem(null)
    setForm(emptyForm)
    setFormError('')
    setFormCriterios([])
    setFormComplexidades([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.criterioId) { setFormError('Critério é obrigatório.'); return }
    if (!form.complexidadeId) { setFormError('Complexidade é obrigatória.'); return }
    if (!form.valorEsforco || isNaN(Number(form.valorEsforco)) || Number(form.valorEsforco) <= 0) {
      setFormError('Valor do esforço deve ser um número positivo.'); return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const url = editItem ? `/api/esforcos/${editItem.id}` : '/api/esforcos'
      const method = editItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criterioId: form.criterioId,
          complexidadeId: form.complexidadeId,
          valorEsforco: Number(form.valorEsforco),
          unidadeEsforco: form.unidadeEsforco,
          observacao: form.observacao.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setFormError(json.error ?? 'Erro ao salvar.'); return }
      closeForm()
      await fetchEsforcos()
      showSuccess(editItem ? 'Esforço atualizado com sucesso.' : 'Esforço criado com sucesso.')
    } catch {
      setFormError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleAtivo = async (item: Esforco) => {
    try {
      const res = await fetch(`/api/esforcos/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !item.ativo }),
      })
      if (!res.ok) { const json = await res.json(); showError(json.error ?? 'Erro ao alterar status.'); return }
      await fetchEsforcos()
      showSuccess(`Esforço ${!item.ativo ? 'ativado' : 'desativado'} com sucesso.`)
    } catch {
      showError('Erro de conexão.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/esforcos/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao excluir.'); return }
      setDeleteConfirm(null)
      await fetchEsforcos()
      showSuccess('Esforço excluído com sucesso.')
    } catch {
      showError('Erro de conexão.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Gestão de Esforços</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gerencie os valores de esforço por critério e complexidade.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <span>+</span> Novo Esforço
        </button>
      </div>

      {/* Banners */}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-300">{success}</div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300">{error}</div>
      )}

      {/* Filters - Cascading */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-area" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Área:</label>
          <select
            id="filter-area"
            value={filterAreaId}
            onChange={(e) => { setFilterAreaId(e.target.value); setFilterCriterioId('') }}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filter-criterio" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Critério:</label>
          <select
            id="filter-criterio"
            value={filterCriterioId}
            onChange={(e) => setFilterCriterioId(e.target.value)}
            disabled={!filterAreaId}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
          >
            <option value="">Todos</option>
            {criterios.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        {(filterAreaId || filterCriterioId) && (
          <button
            onClick={() => { setFilterAreaId(''); setFilterCriterioId('') }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
            <svg className="mr-2 h-4 w-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando...
          </div>
        ) : esforcos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="mb-3 h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">Nenhum esforço encontrado.</p>
            <button onClick={openCreate} className="mt-3 text-sm text-blue-600 hover:underline">
              Criar primeiro esforço
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Critério</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Complexidade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Valor do Esforço</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Unidade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Observação</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {esforcos.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.criterio.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.complexidade.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{item.valorEsforco}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">{item.unidadeEsforco}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{item.observacao ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={() => openEdit(item)} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleAtivo(item)}
                          className={`rounded px-2 py-1 text-xs font-medium ${item.ativo ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
                        >
                          {item.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button onClick={() => setDeleteConfirm(item.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editItem ? 'Editar Esforço' : 'Novo Esforço'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4 px-6 py-4">
                {formError && (
                  <div className="rounded bg-red-50 border border-red-200 p-2 text-sm text-red-700">{formError}</div>
                )}

                {/* Area selector for cascading (create only) */}
                {!editItem && (
                  <div>
                    <label htmlFor="f-area" className="block text-sm font-medium text-gray-700">Área</label>
                    <select
                      id="f-area"
                      defaultValue={filterAreaId}
                      onChange={(e) => handleFormAreaChange(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Selecione uma área</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="f-criterio" className="block text-sm font-medium text-gray-700">
                    Critério <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="f-criterio"
                    value={form.criterioId}
                    onChange={(e) => handleFormCriterioChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Selecione um critério</option>
                    {formCriterios.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="f-complexidade" className="block text-sm font-medium text-gray-700">
                    Complexidade <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="f-complexidade"
                    value={form.complexidadeId}
                    onChange={(e) => setForm((f) => ({ ...f, complexidadeId: e.target.value }))}
                    disabled={!form.criterioId}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                  >
                    <option value="">Selecione uma complexidade</option>
                    {formComplexidades.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="f-valor" className="block text-sm font-medium text-gray-700">
                      Valor <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="f-valor"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.valorEsforco}
                      onChange={(e) => setForm((f) => ({ ...f, valorEsforco: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="f-unidade" className="block text-sm font-medium text-gray-700">Unidade</label>
                    <select
                      id="f-unidade"
                      value={form.unidadeEsforco}
                      onChange={(e) => setForm((f) => ({ ...f, unidadeEsforco: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="horas">Horas</option>
                      <option value="pontos">Pontos</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="f-obs" className="block text-sm font-medium text-gray-700">Observação</label>
                  <textarea
                    id="f-obs"
                    value={form.observacao}
                    onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Observação opcional"
                    maxLength={500}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
                <button type="button" onClick={closeForm} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting && (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {editItem ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900">Confirmar exclusão</h2>
              <p className="mt-2 text-sm text-gray-600">
                Tem certeza que deseja excluir este esforço? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
