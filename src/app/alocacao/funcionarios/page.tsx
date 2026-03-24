'use client'

import { useState, useEffect, useCallback } from 'react'

interface Funcionario {
  id: string
  nome: string
  cargo: string | null
  ativo: boolean
}

interface FormData {
  nome: string
  cargo: string
}

const emptyForm: FormData = { nome: '', cargo: '' }

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Funcionario | null>(null)
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

  const fetchFuncionarios = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/funcionarios')
      const json = await res.json()
      setFuncionarios(Array.isArray(json) ? json : [])
    } catch {
      showError('Erro ao carregar funcionários.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFuncionarios()
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role === 'ADMIN') setIsAdmin(true)
      })
      .catch(() => {})
  }, [fetchFuncionarios])

  const openCreate = () => {
    setEditItem(null)
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (f: Funcionario) => {
    setEditItem(f)
    setForm({ nome: f.nome, cargo: f.cargo ?? '' })
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
    setSubmitting(true)
    setFormError('')
    try {
      const url = editItem ? `/api/funcionarios/${editItem.id}` : '/api/funcionarios'
      const method = editItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), cargo: form.cargo.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) {
        setFormError(json.error ?? 'Erro ao salvar.')
        return
      }
      closeForm()
      await fetchFuncionarios()
      showSuccess(editItem ? 'Funcionário atualizado com sucesso.' : 'Funcionário criado com sucesso.')
    } catch {
      setFormError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/funcionarios/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        showError(json.error ?? 'Erro ao excluir.')
        return
      }
      setDeleteConfirm(null)
      await fetchFuncionarios()
      showSuccess('Funcionário excluído com sucesso.')
    } catch {
      showError('Erro de conexão.')
    }
  }

  const handleToggleAtivo = async (f: Funcionario) => {
    try {
      const res = await fetch(`/api/funcionarios/${f.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !f.ativo }),
      })
      if (!res.ok) {
        const json = await res.json()
        showError(json.error ?? 'Erro ao alterar status.')
        return
      }
      await fetchFuncionarios()
      showSuccess(`Funcionário ${!f.ativo ? 'ativado' : 'desativado'} com sucesso.`)
    } catch {
      showError('Erro de conexão.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Funcionários</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gerencie os membros do time disponíveis para alocação.</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Funcionário
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

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
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
            <p className="text-sm">Nenhum funcionário cadastrado.</p>
            {isAdmin && (
              <button onClick={openCreate} className="mt-3 text-sm text-teal-600 hover:underline">
                Cadastrar primeiro funcionário
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 sm:hidden">
              {funcionarios.map((f) => (
                <li key={f.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{f.nome}</p>
                      {f.cargo && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.cargo}</p>}
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${f.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {f.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(f)} className="flex-1 rounded py-1.5 text-sm font-medium text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30">Editar</button>
                      <button onClick={() => handleToggleAtivo(f)} className={`flex-1 rounded py-1.5 text-sm font-medium border ${f.ativo ? 'text-yellow-600 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'text-green-600 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30'}`}>{f.ativo ? 'Desativar' : 'Ativar'}</button>
                      <button onClick={() => setDeleteConfirm(f.id)} className="flex-1 rounded py-1.5 text-sm font-medium text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30">Excluir</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <table className="hidden sm:table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Cargo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {funcionarios.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{f.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{f.cargo ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${f.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {f.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button onClick={() => openEdit(f)} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30">Editar</button>
                          <button onClick={() => handleToggleAtivo(f)} className={`rounded px-2 py-1 text-xs font-medium ${f.ativo ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'}`}>{f.ativo ? 'Desativar' : 'Ativar'}</button>
                          <button onClick={() => setDeleteConfirm(f.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">Excluir</button>
                        </div>
                      </td>
                    )}
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
                {editItem ? 'Editar Funcionário' : 'Novo Funcionário'}
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
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="nome"
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Nome do funcionário"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cargo
                  </label>
                  <input
                    id="cargo"
                    type="text"
                    value={form.cargo}
                    onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Ex: Desenvolvedor, Analista..."
                    maxLength={100}
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
                  className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar exclusão</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja excluir este funcionário? Todas as alocações associadas serão removidas.
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
