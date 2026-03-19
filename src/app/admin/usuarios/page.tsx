'use client'

import { useState, useEffect, useCallback } from 'react'

interface Usuario {
  id: string
  email: string
  nome: string
  role: 'ADMIN' | 'VIEWER'
  ativo: boolean
  createdAt: string
}

interface CreateForm {
  email: string
  nome: string
  senha: string
  role: 'ADMIN' | 'VIEWER'
}

interface EditForm {
  nome: string
  role: 'ADMIN' | 'VIEWER'
  ativo: boolean
  senha: string
}

const emptyCreateForm: CreateForm = { email: '', nome: '', senha: '', role: 'VIEWER' }

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit modal
  const [editItem, setEditItem] = useState<Usuario | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ nome: '', role: 'VIEWER', ativo: true, senha: '' })
  const [editError, setEditError] = useState('')
  const [editing, setEditing] = useState(false)

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const showErrorMsg = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 5000)
  }

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/usuarios')
      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true)
        return
      }
      const json = await res.json()
      setUsuarios(Array.isArray(json) ? json : [])
    } catch {
      showErrorMsg('Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  // Create handlers
  const openCreate = () => {
    setCreateForm(emptyCreateForm)
    setCreateError('')
    setShowCreate(true)
  }

  const closeCreate = () => {
    setShowCreate(false)
    setCreateForm(emptyCreateForm)
    setCreateError('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.email.trim()) { setCreateError('Email é obrigatório.'); return }
    if (!createForm.nome.trim()) { setCreateError('Nome é obrigatório.'); return }
    if (!createForm.senha) { setCreateError('Senha é obrigatória.'); return }
    if (createForm.senha.length < 6) { setCreateError('Senha deve ter pelo menos 6 caracteres.'); return }
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email.trim().toLowerCase(),
          nome: createForm.nome.trim(),
          senha: createForm.senha,
          role: createForm.role,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setCreateError(json.error ?? 'Erro ao criar usuário.'); return }
      closeCreate()
      await fetchUsuarios()
      showSuccessMsg('Usuário criado com sucesso.')
    } catch {
      setCreateError('Erro de conexão. Tente novamente.')
    } finally {
      setCreating(false)
    }
  }

  // Edit handlers
  const openEdit = (u: Usuario) => {
    setEditItem(u)
    setEditForm({ nome: u.nome, role: u.role, ativo: u.ativo, senha: '' })
    setEditError('')
  }

  const closeEdit = () => {
    setEditItem(null)
    setEditForm({ nome: '', role: 'VIEWER', ativo: true, senha: '' })
    setEditError('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItem) return
    if (!editForm.nome.trim()) { setEditError('Nome é obrigatório.'); return }
    if (editForm.senha && editForm.senha.length < 6) { setEditError('Nova senha deve ter pelo menos 6 caracteres.'); return }
    setEditing(true)
    setEditError('')
    try {
      const body: Record<string, unknown> = {
        nome: editForm.nome.trim(),
        role: editForm.role,
        ativo: editForm.ativo,
      }
      if (editForm.senha) body.senha = editForm.senha
      const res = await fetch(`/api/admin/usuarios/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setEditError(json.error ?? 'Erro ao atualizar usuário.'); return }
      closeEdit()
      await fetchUsuarios()
      showSuccessMsg('Usuário atualizado com sucesso.')
    } catch {
      setEditError('Erro de conexão. Tente novamente.')
    } finally {
      setEditing(false)
    }
  }

  // Toggle ativo
  const handleToggleAtivo = async (u: Usuario) => {
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !u.ativo }),
      })
      if (!res.ok) {
        const json = await res.json()
        showErrorMsg(json.error ?? 'Erro ao alterar status.')
        return
      }
      await fetchUsuarios()
      showSuccessMsg(`Usuário ${!u.ativo ? 'ativado' : 'desativado'} com sucesso.`)
    } catch {
      showErrorMsg('Erro de conexão.')
    }
  }

  if (unauthorized) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-6 text-center">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          Acesso negado. Você não tem permissão para acessar esta página.
        </p>
      </div>
    )
  }

  const inputClass =
    'mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'

  const selectClass =
    'mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Gestão de Usuários</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gerencie os usuários com acesso ao sistema.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <span aria-hidden="true">+</span> Novo Usuário
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
        ) : usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="mb-3 h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Perfil</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Criado em</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{u.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.role === 'ADMIN' ? (
                      <span className="inline-flex items-center rounded-full bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 text-xs font-medium text-teal-800 dark:text-teal-300">
                        ADMIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                        VIEWER
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.ativo ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded px-2 py-1 text-xs font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleAtivo(u)}
                        className={`rounded px-2 py-1 text-xs font-medium ${u.ativo ? 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                      >
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-create-title">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 id="modal-create-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Novo Usuário
              </h2>
            </div>
            <form onSubmit={handleCreate} noValidate>
              <div className="space-y-4 px-6 py-4">
                {createError && (
                  <div className="rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 text-sm text-red-700 dark:text-red-300">
                    {createError}
                  </div>
                )}
                <div>
                  <label htmlFor="c-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    className={inputClass}
                    placeholder="usuario@empresa.com"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="c-nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="c-nome"
                    type="text"
                    value={createForm.nome}
                    onChange={(e) => setCreateForm((f) => ({ ...f, nome: e.target.value }))}
                    className={inputClass}
                    placeholder="Nome completo"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label htmlFor="c-senha" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Senha <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="c-senha"
                    type="password"
                    value={createForm.senha}
                    onChange={(e) => setCreateForm((f) => ({ ...f, senha: e.target.value }))}
                    className={inputClass}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label htmlFor="c-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Perfil <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="c-role"
                    value={createForm.role}
                    onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as 'ADMIN' | 'VIEWER' }))}
                    className={selectClass}
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                <button
                  type="button"
                  onClick={closeCreate}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {creating && (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-edit-title">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 id="modal-edit-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Editar Usuário
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{editItem.email}</p>
            </div>
            <form onSubmit={handleEdit} noValidate>
              <div className="space-y-4 px-6 py-4">
                {editError && (
                  <div className="rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 text-sm text-red-700 dark:text-red-300">
                    {editError}
                  </div>
                )}
                <div>
                  <label htmlFor="e-nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="e-nome"
                    type="text"
                    value={editForm.nome}
                    onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                    className={inputClass}
                    placeholder="Nome completo"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label htmlFor="e-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Perfil
                  </label>
                  <select
                    id="e-role"
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as 'ADMIN' | 'VIEWER' }))}
                    className={selectClass}
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="e-ativo"
                    type="checkbox"
                    checked={editForm.ativo}
                    onChange={(e) => setEditForm((f) => ({ ...f, ativo: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="e-ativo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Usuário ativo
                  </label>
                </div>
                <div>
                  <label htmlFor="e-senha" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nova senha
                    <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">(deixe em branco para manter)</span>
                  </label>
                  <input
                    id="e-senha"
                    type="password"
                    value={editForm.senha}
                    onChange={(e) => setEditForm((f) => ({ ...f, senha: e.target.value }))}
                    className={inputClass}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {editing && (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
