'use client'

import { useState, useEffect, useCallback } from 'react'

interface Area {
  id: string
  nome: string
}

interface Criterio {
  id: string
  nome: string
  descricao: string | null
  areaId: string
  ativo: boolean
  area: { nome: string }
  _count: { complexidades: number }
}

interface FormData {
  nome: string
  descricao: string
  areaId: string
}

const emptyForm: FormData = { nome: '', descricao: '', areaId: '' }

export default function CriteriosPage() {
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [filterAreaId, setFilterAreaId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Criterio | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 5000)
  }

  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch('/api/areas?ativo=true')
      const json = await res.json()
      setAreas(Array.isArray(json) ? json : [])
    } catch {
      // silently fail; areas are optional for filter
    }
  }, [])

  const fetchCriterios = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterAreaId) params.set('areaId', filterAreaId)
      const res = await fetch(`/api/criterios?${params.toString()}`)
      const json = await res.json()
      setCriterios(Array.isArray(json) ? json : [])
    } catch {
      showError('Erro ao carregar critérios.')
    } finally {
      setLoading(false)
    }
  }, [filterAreaId])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  useEffect(() => {
    fetchCriterios()
  }, [fetchCriterios])

  const openCreate = () => {
    setEditItem(null)
    setForm({ ...emptyForm, areaId: filterAreaId })
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (criterio: Criterio) => {
    setEditItem(criterio)
    setForm({ nome: criterio.nome, descricao: criterio.descricao ?? '', areaId: criterio.areaId })
    setFormError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditItem(null)
    setForm(emptyForm)
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) { setFormError('Nome é obrigatório.'); return }
    if (!form.areaId) { setFormError('Área é obrigatória.'); return }
    setSubmitting(true)
    setFormError('')
    try {
      const url = editItem ? `/api/criterios/${editItem.id}` : '/api/criterios'
      const method = editItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          areaId: form.areaId,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setFormError(json.error ?? 'Erro ao salvar.'); return }
      closeForm()
      await fetchCriterios()
      showSuccess(editItem ? 'Critério atualizado com sucesso.' : 'Critério criado com sucesso.')
    } catch {
      setFormError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleAtivo = async (criterio: Criterio) => {
    try {
      const res = await fetch(`/api/criterios/${criterio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !criterio.ativo }),
      })
      if (!res.ok) { const json = await res.json(); showError(json.error ?? 'Erro ao alterar status.'); return }
      await fetchCriterios()
      showSuccess(`Critério ${!criterio.ativo ? 'ativado' : 'desativado'} com sucesso.`)
    } catch {
      showError('Erro de conexão.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/criterios/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao excluir.'); return }
      setDeleteConfirm(null)
      await fetchCriterios()
      showSuccess('Critério excluído com sucesso.')
    } catch {
      showError('Erro de conexão.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Gestão de Critérios</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gerencie os critérios de avaliação por área.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <span>+</span> Novo Critério
        </button>
      </div>

      {/* Banners */}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-300">{success}</div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300">{error}</div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="filter-area" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          Filtrar por Área:
        </label>
        <select
          id="filter-area"
          value={filterAreaId}
          onChange={(e) => setFilterAreaId(e.target.value)}
          className="flex-1 min-w-[160px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todas as áreas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>
        {filterAreaId && (
          <button onClick={() => setFilterAreaId('')} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Limpar filtro
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
            <svg className="mr-2 h-4 w-4 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando...
          </div>
        ) : criterios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="mb-3 h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Nenhum critério encontrado.</p>
            <button onClick={openCreate} className="mt-3 text-sm text-blue-600 hover:underline">
              Criar primeiro critério
            </button>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 sm:hidden">
              {criterios.map((c) => (
                <li key={c.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{c.nome}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.area.nome} · {c._count.complexidades} complexidade(s)</p>
                      {c.descricao && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{c.descricao}</p>}
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="flex-1 rounded py-1.5 text-sm font-medium text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30">Editar</button>
                    <button onClick={() => handleToggleAtivo(c)} className={`flex-1 rounded py-1.5 text-sm font-medium border ${c.ativo ? 'text-yellow-600 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'text-green-600 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30'}`}>{c.ativo ? 'Desativar' : 'Ativar'}</button>
                    <button onClick={() => setDeleteConfirm(c.id)} className="flex-1 rounded py-1.5 text-sm font-medium text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30">Excluir</button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <table className="hidden sm:table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Área</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Complexidades</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {criterios.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{c.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{c.descricao ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{c.area.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{c._count.complexidades}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={() => openEdit(c)} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30">Editar</button>
                        <button onClick={() => handleToggleAtivo(c)} className={`rounded px-2 py-1 text-xs font-medium ${c.ativo ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'}`}>{c.ativo ? 'Desativar' : 'Ativar'}</button>
                        <button onClick={() => setDeleteConfirm(c.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editItem ? 'Editar Critério' : 'Novo Critério'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4 px-6 py-4">
                {formError && (
                  <div className="rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 text-sm text-red-700 dark:text-red-300">{formError}</div>
                )}
                <div>
                  <label htmlFor="f-nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="f-nome"
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Nome do critério"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label htmlFor="f-area" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Área <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="f-area"
                    value={form.areaId}
                    onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Selecione uma área</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="f-descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descrição
                  </label>
                  <textarea
                    id="f-descricao"
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Descrição opcional"
                    maxLength={500}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                <button type="button" onClick={closeForm} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
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
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar exclusão</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja excluir este critério? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
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
