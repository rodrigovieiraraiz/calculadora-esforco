'use client'

import { useState, useEffect, useCallback } from 'react'

interface Area {
  id: string
  nome: string
}

interface Componente {
  id: string
  nome: string
  descricao: string | null
  areaId: string
  ativo: boolean
  area: Area
}

interface FormData {
  nome: string
  descricao: string
  areaId: string
}

const emptyForm: FormData = { nome: '', descricao: '', areaId: '' }

export default function ComponentesPage() {
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Componente | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBatchDelete, setShowBatchDelete] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [filterArea, setFilterArea] = useState('')

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
      // silent
    }
  }, [])

  const fetchComponentes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/componentes')
      const json = await res.json()
      setComponentes(Array.isArray(json) ? json : [])
    } catch {
      showError('Erro ao carregar componentes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAreas()
    fetchComponentes()
  }, [fetchAreas, fetchComponentes])

  const filtered = filterArea
    ? componentes.filter((c) => c.areaId === filterArea)
    : componentes

  const openCreate = () => {
    setEditItem(null)
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (comp: Componente) => {
    setEditItem(comp)
    setForm({ nome: comp.nome, descricao: comp.descricao ?? '', areaId: comp.areaId })
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
    if (!form.nome.trim()) {
      setFormError('Nome é obrigatório.')
      return
    }
    if (!form.areaId) {
      setFormError('Área é obrigatória.')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const url = editItem ? `/api/componentes/${editItem.id}` : '/api/componentes'
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
      if (!res.ok) {
        setFormError(json.error ?? 'Erro ao salvar.')
        return
      }
      closeForm()
      await fetchComponentes()
      showSuccess(editItem ? 'Componente atualizado com sucesso.' : 'Componente criado com sucesso.')
    } catch {
      setFormError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleAtivo = async (comp: Componente) => {
    try {
      const res = await fetch(`/api/componentes/${comp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !comp.ativo }),
      })
      if (!res.ok) {
        const json = await res.json()
        showError(json.error ?? 'Erro ao alterar status.')
        return
      }
      await fetchComponentes()
      showSuccess(`Componente ${!comp.ativo ? 'ativado' : 'desativado'} com sucesso.`)
    } catch {
      showError('Erro de conexão.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/componentes/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        showError(json.error ?? 'Erro ao excluir.')
        return
      }
      setDeleteConfirm(null)
      await fetchComponentes()
      showSuccess('Componente excluído com sucesso.')
    } catch {
      showError('Erro de conexão.')
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((c) => c.id)))
  }

  const handleBatchDelete = async () => {
    setBatchDeleting(true)
    try {
      const res = await fetch('/api/componentes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao excluir.'); return }
      setShowBatchDelete(false)
      setSelected(new Set())
      await fetchComponentes()
      showSuccess(json.message ?? 'Componentes removidos.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setBatchDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Gestão de Componentes</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gerencie os componentes associados às áreas do sistema.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <span>+</span> Novo Componente
        </button>
      </div>

      {/* Banners */}
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

      {/* Filter by area */}
      <div className="flex items-center gap-3">
        <label htmlFor="filterArea" className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por área:</label>
        <select
          id="filterArea"
          value={filterArea}
          onChange={(e) => { setFilterArea(e.target.value); setSelected(new Set()) }}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todas as áreas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>
        {filterArea && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {filtered.length} componente(s)
          </span>
        )}
      </div>

      {/* Batch selection toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-teal-900 dark:text-teal-200">
            {selected.size} {selected.size === 1 ? 'componente selecionado' : 'componentes selecionados'}
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
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
            <svg className="mr-2 h-4 w-4 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="mb-3 h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm">{filterArea ? 'Nenhum componente nesta área.' : 'Nenhum componente cadastrado.'}</p>
            <button onClick={openCreate} className="mt-3 text-sm text-blue-600 hover:underline">
              Criar primeiro componente
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" aria-label="Selecionar todos" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Área</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filtered.map((comp) => (
                <tr key={comp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 w-10">
                    <input type="checkbox" checked={selected.has(comp.id)} onChange={() => toggleSelect(comp.id)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{comp.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                      {comp.area.nome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{comp.descricao ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${comp.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {comp.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => openEdit(comp)}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleAtivo(comp)}
                        className={`rounded px-2 py-1 text-xs font-medium ${comp.ativo ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
                      >
                        {comp.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(comp.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editItem ? 'Editar Componente' : 'Novo Componente'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4 px-6 py-4">
                {formError && (
                  <div className="rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 text-sm text-red-700 dark:text-red-300">
                    {formError}
                  </div>
                )}
                <div>
                  <label htmlFor="areaId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Área <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="areaId"
                    value={form.areaId}
                    onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Selecione uma área</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="nome"
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Nome do componente"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descrição
                  </label>
                  <textarea
                    id="descricao"
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
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
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

      {/* Batch Delete Confirmation */}
      {showBatchDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar exclusão em lote</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja excluir {selected.size} {selected.size === 1 ? 'componente' : 'componentes'}? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button onClick={() => setShowBatchDelete(false)} disabled={batchDeleting} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={handleBatchDelete} disabled={batchDeleting} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {batchDeleting ? 'Removendo...' : `Excluir ${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar exclusão</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja excluir este componente? Esta ação não pode ser desfeita.
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
