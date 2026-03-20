'use client'

import { useState, useEffect, useCallback } from 'react'

interface Area { id: string; nome: string }
interface Componente { id: string; nome: string; areaId: string }

const DEFAULT_VALOR_HORA = 150.0

interface ParamRow {
  criterioId: string
  criterioNome: string
  complexidadeId: string
  complexidadeNome: string
  complexidadeOrdem: number
  esforcoId: string | null
  valorEsforco: number
  componenteId: string | null
  componenteNome: string | null
}

const COMPLEXIDADE_OPTIONS = ['Baixa', 'Média', 'Alta', 'Muito Alta']

export default function ParametrizacaoPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [selectedComponenteId, setSelectedComponenteId] = useState('')
  const [rows, setRows] = useState<ParamRow[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // New entry form
  const [criterioNome, setCriterioNome] = useState('')
  const [complexidadeNome, setComplexidadeNome] = useState('')
  const [valorEsforco, setValorEsforco] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Selection for batch delete
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Inline esforço edit
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Inline criterio rename
  const [editingCriterio, setEditingCriterio] = useState<string | null>(null)
  const [editCriterioNome, setEditCriterioNome] = useState('')

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Single row delete
  const [deleteRow, setDeleteRow] = useState<ParamRow | null>(null)

  // Edit mode (filling form with existing row data)
  const [editingRow, setEditingRow] = useState<ParamRow | null>(null)

  // Valor hora config
  const [valorHora, setValorHora] = useState<number>(DEFAULT_VALOR_HORA)
  const [valorHoraInput, setValorHoraInput] = useState<string>(String(DEFAULT_VALOR_HORA))
  const [savingValorHora, setSavingValorHora] = useState(false)

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000) }

  useEffect(() => {
    fetch('/api/admin/hourly-rate')
      .then((r) => r.json())
      .then((json) => {
        if (json.valorHora) {
          setValorHora(json.valorHora)
          setValorHoraInput(String(json.valorHora))
        }
      })
      .catch(() => {})
  }, [])

  const handleSaveValorHora = async () => {
    const valor = Number(valorHoraInput)
    if (!valor || valor <= 0) { showError('Valor hora deve ser maior que zero.'); return }
    setSavingValorHora(true)
    try {
      const res = await fetch('/api/admin/hourly-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valorHora: valor }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao salvar.'); return }
      setValorHora(json.valorHora)
      setValorHoraInput(String(json.valorHora))
      showSuccess('Valor hora atualizado com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setSavingValorHora(false)
    }
  }

  useEffect(() => {
    fetch('/api/areas?ativo=true')
      .then((r) => r.json())
      .then((json) => setAreas(Array.isArray(json) ? json : []))
      .catch(() => {})
  }, [])

  const fetchRows = useCallback(async (areaId: string) => {
    if (!areaId) { setRows([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/parametrizacao?areaId=${areaId}`)
      const json = await res.json()
      setRows(Array.isArray(json) ? json : [])
    } catch {
      showError('Erro ao carregar dados.')
    } finally {
      setLoading(false)
      setSelected(new Set())
    }
  }, [])

  useEffect(() => {
    if (selectedAreaId) {
      fetchRows(selectedAreaId)
      fetch(`/api/componentes?areaId=${selectedAreaId}&ativo=true`)
        .then((r) => r.json())
        .then((json) => setComponentes(Array.isArray(json) ? json : []))
        .catch(() => setComponentes([]))
    } else {
      setRows([])
      setSelected(new Set())
      setComponentes([])
    }
    setSelectedComponenteId('')
  }, [selectedAreaId, fetchRows])

  const grouped = rows.reduce<Record<string, ParamRow[]>>((acc, row) => {
    const key = `${row.criterioId}|${row.criterioNome}|${row.componenteId ?? ''}|${row.componenteNome ?? ''}`
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})

  const rowKey = (r: ParamRow) => `${r.criterioId}:${r.complexidadeId}:${r.componenteId ?? ''}`

  // ─── Selection ─────────────────────────────────────────────────────────────

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map(rowKey)))
    }
  }

  const toggleSelectGroup = (criterioId: string) => {
    const groupRows = rows.filter((r) => r.criterioId === criterioId)
    const groupKeys = groupRows.map(rowKey)
    const allSelected = groupKeys.every((k) => selected.has(k))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        groupKeys.forEach((k) => next.delete(k))
      } else {
        groupKeys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  // ─── Add entry ─────────────────────────────────────────────────────────────

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAreaId) { showError('Selecione uma área.'); return }
    if (!selectedComponenteId) { showError('Componente é obrigatório.'); return }
    if (!criterioNome.trim()) { showError('Critério é obrigatório.'); return }
    if (!complexidadeNome) { showError('Complexidade é obrigatória.'); return }
    if (!valorEsforco || Number(valorEsforco) <= 0) { showError('Esforço deve ser maior que zero.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/parametrizacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaId: selectedAreaId,
          componenteId: selectedComponenteId,
          criterioNome: criterioNome.trim(),
          complexidadeNome,
          valorEsforco: Number(valorEsforco),
        }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao salvar.'); return }
      setCriterioNome('')
      setComplexidadeNome('')
      setValorEsforco('')
      setEditingRow(null)
      await fetchRows(selectedAreaId)
      showSuccess(editingRow ? 'Atualizado com sucesso.' : 'Cadastrado com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Inline esforço edit ───────────────────────────────────────────────────

  const startEditEsforco = (row: ParamRow) => {
    setEditingKey(rowKey(row))
    setEditValue(String(row.valorEsforco))
  }

  const saveEditEsforco = async (row: ParamRow) => {
    if (!editValue || Number(editValue) <= 0) { setEditingKey(null); return }
    try {
      await fetch('/api/parametrizacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaId: selectedAreaId,
          componenteId: row.componenteId,
          criterioNome: row.criterioNome,
          complexidadeNome: row.complexidadeNome,
          valorEsforco: Number(editValue),
        }),
      })
      setEditingKey(null)
      await fetchRows(selectedAreaId)
    } catch {
      showError('Erro ao salvar.')
    }
  }

  // ─── Inline criterio rename ────────────────────────────────────────────────

  const startEditCriterio = (criterioId: string, nome: string) => {
    setEditingCriterio(criterioId)
    setEditCriterioNome(nome)
  }

  const saveEditCriterio = async (criterioId: string) => {
    if (!editCriterioNome.trim()) { setEditingCriterio(null); return }
    try {
      const res = await fetch('/api/parametrizacao', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criterioId, nome: editCriterioNome.trim() }),
      })
      if (!res.ok) { const j = await res.json(); showError(j.error ?? 'Erro ao renomear.'); return }
      setEditingCriterio(null)
      await fetchRows(selectedAreaId)
      showSuccess('Critério renomeado.')
    } catch {
      showError('Erro de conexão.')
    }
  }

  // ─── Batch delete ──────────────────────────────────────────────────────────

  const handleBatchDelete = async () => {
    setDeleting(true)
    try {
      const items = Array.from(selected).map((key) => {
        const [criterioId, complexidadeId, componenteId] = key.split(':')
        return { criterioId, complexidadeId, componenteId: componenteId || null }
      })
      const res = await fetch('/api/parametrizacao', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao remover.'); return }
      setShowDeleteConfirm(false)
      setSelected(new Set())
      await fetchRows(selectedAreaId)
      showSuccess(json.message ?? 'Removido com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Single row delete ────────────────────────────────────────────────────

  const handleSingleDelete = async () => {
    if (!deleteRow) return
    setDeleting(true)
    try {
      const res = await fetch('/api/parametrizacao', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ criterioId: deleteRow.criterioId, complexidadeId: deleteRow.complexidadeId, componenteId: deleteRow.componenteId }],
        }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao remover.'); return }
      setDeleteRow(null)
      await fetchRows(selectedAreaId)
      showSuccess(json.message ?? 'Removido com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Edit row (populate form) ────────────────────────────────────────────

  const handleEditRow = (row: ParamRow) => {
    setSelectedComponenteId(row.componenteId ?? '')
    setCriterioNome(row.criterioNome)
    setComplexidadeNome(row.complexidadeNome)
    setValorEsforco(String(row.valorEsforco))
    setEditingRow(row)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingRow(null)
    setSelectedComponenteId('')
    setCriterioNome('')
    setComplexidadeNome('')
    setValorEsforco('')
  }

  const inputClass = "rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
  const allSelected = rows.length > 0 && selected.size === rows.length
  const existingCriterios = [...new Set(rows.map((r) => r.criterioNome))]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Parametrização</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Cadastre critérios, complexidades e esforços em um único formulário.
        </p>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-300">{success}</div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300">{error}</div>
      )}

      {/* Valor hora config */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Valor da Hora de Trabalho</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Usado para converter ganhos do tipo &ldquo;Redução de Horas&rdquo; para valor financeiro (R$) antes de calcular o score de priorização.
        </p>
        <div className="flex items-end gap-3">
          <div className="w-40">
            <label htmlFor="valor-hora" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Valor hora (R$)
            </label>
            <input
              id="valor-hora"
              type="number"
              min="0.01"
              step="0.01"
              value={valorHoraInput}
              onChange={(e) => setValorHoraInput(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </div>
          <button
            type="button"
            onClick={handleSaveValorHora}
            disabled={savingValorHora || Number(valorHoraInput) === valorHora}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {savingValorHora ? 'Salvando...' : 'Salvar'}
          </button>
          {Number(valorHoraInput) !== valorHora && (
            <button
              type="button"
              onClick={() => setValorHoraInput(String(valorHora))}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Area selector */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <label htmlFor="area-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Área Técnica
        </label>
        <select
          id="area-select"
          value={selectedAreaId}
          onChange={(e) => setSelectedAreaId(e.target.value)}
          className={`${inputClass} w-full max-w-sm`}
        >
          <option value="">Selecione uma área</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>

      {selectedAreaId && (
        <>
          {/* Add new entry form */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {editingRow ? 'Editar registro' : 'Novo cadastro'}
              </h2>
              {editingRow && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancelar edição
                </button>
              )}
            </div>
            <form onSubmit={handleAddEntry} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px]">
                <label htmlFor="f-componente" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Componente</label>
                <select
                  id="f-componente"
                  value={selectedComponenteId}
                  onChange={(e) => setSelectedComponenteId(e.target.value)}
                  className={`${inputClass} w-full`}
                >
                  <option value="">Selecione</option>
                  {componentes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label htmlFor="f-criterio" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Critério</label>
                <input
                  id="f-criterio"
                  type="text"
                  value={criterioNome}
                  onChange={(e) => setCriterioNome(e.target.value)}
                  placeholder="Ex: Complexidade de regras"
                  maxLength={100}
                  list="criterios-existentes"
                  className={`${inputClass} w-full`}
                />
                <datalist id="criterios-existentes">
                  {existingCriterios.map((nome) => <option key={nome} value={nome} />)}
                </datalist>
              </div>
              <div className="min-w-[160px]">
                <label htmlFor="f-complexidade" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Complexidade</label>
                <select id="f-complexidade" value={complexidadeNome} onChange={(e) => setComplexidadeNome(e.target.value)} className={`${inputClass} w-full`}>
                  <option value="">Selecione</option>
                  {COMPLEXIDADE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="w-28">
                <label htmlFor="f-esforco" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Esforço (h)</label>
                <input id="f-esforco" type="number" min="0.5" step="0.5" value={valorEsforco} onChange={(e) => setValorEsforco(e.target.value)} placeholder="0" className={`${inputClass} w-full`} />
              </div>
              <button type="submit" disabled={submitting} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                {submitting ? 'Salvando...' : editingRow ? 'Atualizar' : '+ Adicionar'}
              </button>
            </form>
          </div>

          {/* Toolbar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-teal-900 dark:text-teal-200">
                {selected.size} {selected.size === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Remover selecionados
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
              >
                Limpar seleção
              </button>
            </div>
          )}

          {/* Data table */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400 text-sm">Carregando...</div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                <p className="text-sm">Nenhum dado cadastrado para esta área.</p>
                <p className="text-xs mt-1">Use o formulário acima para adicionar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          aria-label="Selecionar todos"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Componente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Critério</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Complexidade</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Esforço (h)</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {Object.entries(grouped).map(([groupKey, groupRows]) => {
                      const parts = groupKey.split('|')
                      const criterioId = parts[0]
                      const criterioNomeDisplay = parts[1]
                      const componenteNomeDisplay = parts[3] || '—'
                      const groupKeys = groupRows.map(rowKey)
                      const allGroupSelected = groupKeys.every((k) => selected.has(k))
                      const someGroupSelected = groupKeys.some((k) => selected.has(k))

                      return groupRows.map((row, idx) => {
                        const rk = rowKey(row)
                        const isEditingEsforco = editingKey === rk
                        const isEditingCriterioRow = editingCriterio === criterioId

                        return (
                          <tr key={rk} className="hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800">
                            <td className="px-4 py-3 w-10">
                              <input
                                type="checkbox"
                                checked={selected.has(rk)}
                                onChange={() => toggleSelect(rk)}
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {idx === 0 ? (
                                <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                                  {componenteNomeDisplay}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {idx === 0 ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={allGroupSelected}
                                    ref={(el) => { if (el) el.indeterminate = someGroupSelected && !allGroupSelected }}
                                    onChange={() => toggleSelectGroup(criterioId)}
                                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    aria-label={`Selecionar todo "${criterioNomeDisplay}"`}
                                    title="Selecionar grupo"
                                  />
                                  {isEditingCriterioRow ? (
                                    <input
                                      type="text"
                                      value={editCriterioNome}
                                      onChange={(e) => setEditCriterioNome(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditCriterio(criterioId)
                                        if (e.key === 'Escape') setEditingCriterio(null)
                                      }}
                                      onBlur={() => saveEditCriterio(criterioId)}
                                      autoFocus
                                      className="rounded border border-teal-400 dark:border-teal-600 bg-white dark:bg-gray-700 px-2 py-0.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 w-48"
                                    />
                                  ) : (
                                    <button
                                      onClick={() => startEditCriterio(criterioId, criterioNomeDisplay)}
                                      className="font-medium text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 text-left"
                                      title="Clique para renomear"
                                    >
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                                        {criterioNomeDisplay}
                                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      </span>
                                    </button>
                                  )}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.complexidadeNome}</td>
                            <td className="px-4 py-3 text-right">
                              {isEditingEsforco ? (
                                <input
                                  type="number"
                                  min="0.5"
                                  step="0.5"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditEsforco(row)
                                    if (e.key === 'Escape') setEditingKey(null)
                                  }}
                                  onBlur={() => saveEditEsforco(row)}
                                  autoFocus
                                  className="w-20 text-right rounded border border-teal-400 dark:border-teal-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              ) : (
                                <button
                                  onClick={() => startEditEsforco(row)}
                                  className="text-sm font-medium text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400"
                                  title="Clique para editar"
                                >
                                  {row.valorEsforco}
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEditRow(row)}
                                  className="rounded p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/30"
                                  title="Editar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button
                                  onClick={() => setDeleteRow(row)}
                                  className="rounded p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                                  title="Excluir"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Single row delete confirmation */}
      {deleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar exclusão</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Deseja excluir o registro <strong>{deleteRow.criterioNome}</strong> — <strong>{deleteRow.complexidadeNome}</strong>
                {deleteRow.componenteNome ? ` (${deleteRow.componenteNome})` : ''}?
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button
                onClick={() => setDeleteRow(null)}
                disabled={deleting}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSingleDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar remoção</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja remover {selected.size} {selected.size === 1 ? 'registro' : 'registros'}?
                Critérios e complexidades sem outros registros também serão removidos.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Removendo...' : `Remover ${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
