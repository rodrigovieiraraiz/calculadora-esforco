'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Area {
  id: string
  nome: string
}

interface Complexidade {
  id: string
  nome: string
  esforcoHoras: number
}

interface Componente {
  id: string
  nome: string
}

interface CriterioRow {
  criterioId: string
  criterioNome: string
  complexidadeId: string
  complexidadeNome: string
  componenteId: string | null
  componenteNome: string | null
  esforcoHoras: number
  fonte: 'IA' | 'MANUAL'
  confianca?: number
  modified: boolean
  complexidades: Complexidade[]
}

interface AvailableCriterio {
  id: string
  nome: string
}

interface Analise {
  observacoes: string
  confiancaGeral: number
}

type Step = 'form' | 'review' | 'success'

type TipoGanho = 'REDUCAO_CUSTO' | 'AUMENTO_RECEITA' | 'REDUCAO_HORAS'

const TIPO_GANHO_OPTIONS: { value: TipoGanho; label: string; unit: string }[] = [
  { value: 'REDUCAO_CUSTO', label: 'Redução de Custo', unit: 'R$' },
  { value: 'AUMENTO_RECEITA', label: 'Aumento de Receita', unit: 'R$' },
  { value: 'REDUCAO_HORAS', label: 'Redução de Horas', unit: 'horas/mês' },
]

const URGENCIA_OPTIONS = [
  { value: '', label: 'Selecione (opcional)' },
  { value: 'Baixa', label: 'Baixa' },
  { value: 'Média', label: 'Média' },
  { value: 'Alta', label: 'Alta' },
  { value: 'Crítica', label: 'Crítica' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NovaSolicitacaoPage() {
  const router = useRouter()

  // Step state machine
  const [step, setStep] = useState<Step>('form')
  const [solicitacaoId, setSolicitacaoId] = useState<string | null>(null)

  // Form fields
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [solicitante, setSolicitante] = useState('')
  const [areaSolicitante, setAreaSolicitante] = useState('')
  const [areaId, setAreaId] = useState('')
  const [contexto, setContexto] = useState('')
  const [urgencia, setUrgencia] = useState('')

  // Data
  const [areas, setAreas] = useState<Area[]>([])
  const [criterios, setCriterios] = useState<CriterioRow[]>([])
  const [availableCriterios, setAvailableCriterios] = useState<AvailableCriterio[]>([])
  const [analise, setAnalise] = useState<Analise | null>(null)
  const [esforcoTotal, setEsforcoTotal] = useState(0)

  // Add manual criterio form
  const [manualComponenteId, setManualComponenteId] = useState('')
  const [manualCriterioId, setManualCriterioId] = useState('')
  const [manualComplexidadeId, setManualComplexidadeId] = useState('')
  const [manualComplexidades, setManualComplexidades] = useState<Complexidade[]>([])

  // Componentes for the selected area
  const [componentes, setComponentes] = useState<Componente[]>([])

  // Loading states
  const [loading, setLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Error / success
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Gain modal
  const [showGainModal, setShowGainModal] = useState(false)
  const [tipoGanho, setTipoGanho] = useState<TipoGanho | ''>('')
  const [valorGanho, setValorGanho] = useState('')
  const [descricaoPremissa, setDescricaoPremissa] = useState('')
  const [gainError, setGainError] = useState<string | null>(null)

  // Success data
  const [successData, setSuccessData] = useState<{
    titulo: string
    esforco: number
    tipoGanho: string
    valorGanho: string
    unit: string
  } | null>(null)

  // ─── Load areas on mount ───────────────────────────────────────────────────

  useEffect(() => {
    async function fetchAreas() {
      try {
        const res = await fetch('/api/areas?ativo=true')
        const json = await res.json()
        setAreas(Array.isArray(json) ? json : [])
      } catch {
        setError('Erro ao carregar áreas.')
      }
    }
    fetchAreas()
  }, [])

  // ─── Load available criterios for area (optionally filtered by component) ─

  const fetchAvailableCriterios = useCallback(async (selectedAreaId: string, selectedComponenteId?: string) => {
    if (!selectedAreaId) {
      setAvailableCriterios([])
      return
    }
    try {
      const params = new URLSearchParams({ areaId: selectedAreaId })
      if (selectedComponenteId) params.set('componenteId', selectedComponenteId)
      const res = await fetch(`/api/criterios?${params.toString()}`)
      const json = await res.json()
      setAvailableCriterios(Array.isArray(json) ? json : [])
    } catch {
      // non-blocking
    }
  }, [])

  useEffect(() => {
    if (areaId) {
      fetch(`/api/componentes?areaId=${areaId}&ativo=true`)
        .then((r) => r.json())
        .then((json) => setComponentes(Array.isArray(json) ? json : []))
        .catch(() => setComponentes([]))
    } else {
      setAvailableCriterios([])
      setComponentes([])
    }
  }, [areaId])

  // ─── Re-fetch criterios when area or component selection changes ──────────

  useEffect(() => {
    if (!areaId) return
    setManualCriterioId('')
    setManualComplexidadeId('')
    setManualComplexidades([])
    fetchAvailableCriterios(areaId, manualComponenteId || undefined)
  }, [manualComponenteId, areaId, fetchAvailableCriterios])

  // ─── Load complexidades for manual criterio selector ──────────────────────

  useEffect(() => {
    if (!manualCriterioId) {
      setManualComplexidades([])
      setManualComplexidadeId('')
      return
    }
    async function fetchComplexidades() {
      try {
        const res = await fetch(`/api/complexidades?criterioId=${manualCriterioId}`)
        const json = await res.json()
        setManualComplexidades(Array.isArray(json) ? json : [])
        setManualComplexidadeId('')
      } catch {
        setManualComplexidades([])
      }
    }
    fetchComplexidades()
  }, [manualCriterioId])

  // ─── Load complexidades for a criterio row ────────────────────────────────

  const ensureComplexidades = useCallback(async (criterioId: string): Promise<Complexidade[]> => {
    try {
      const res = await fetch(`/api/complexidades?criterioId=${criterioId}`)
      const json = await res.json()
      return Array.isArray(json) ? json : []
    } catch {
      return []
    }
  }, [])

  // ─── Step 1: Create + Analyze ─────────────────────────────────────────────

  const handleCreateAndAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!titulo.trim()) { setFormError('Título é obrigatório.'); return }
    if (!descricao.trim()) { setFormError('Descrição é obrigatória.'); return }
    if (!areaId) { setFormError('Área é obrigatória.'); return }

    setLoading(true)
    setError(null)

    try {
      // 1. Create solicitacao
      const createRes = await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          solicitante: solicitante.trim() || null,
          areaSolicitante: areaSolicitante.trim() || null,
          areaId,
          contexto: contexto.trim() || null,
          urgencia: urgencia || null,
        }),
      })
      const createJson = await createRes.json()
      if (!createRes.ok) {
        setFormError(createJson.error ?? 'Erro ao criar solicitação.')
        return
      }
      const newId: string = createJson.id
      setSolicitacaoId(newId)

      // 2. Analyze with AI
      const analyzeRes = await fetch(`/api/solicitacoes/${newId}/analisar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const analyzeJson = await analyzeRes.json()
      if (!analyzeRes.ok) {
        setError(analyzeJson.error ?? 'Erro na análise da IA.')
        // still move to review even if analysis failed
      } else {
        setAnalise(analyzeJson.analise ?? null)
        setEsforcoTotal(analyzeJson.esforcoTotal ?? 0)

        // Build criterio rows with complexidades
        const rawCriterios: Array<{
          criterioId: string
          criterioNome: string
          complexidadeId: string
          complexidadeNome: string
          componenteId: string | null
          componenteNome: string | null
          esforcoHoras: number
          fonte: 'IA' | 'MANUAL'
          confianca?: number
        }> = (analyzeJson.criterios ?? []).map((c: Record<string, unknown>) => {
          const criterio = c.criterio as Record<string, unknown> | undefined
          const complexidade = c.complexidade as Record<string, unknown> | undefined
          const componente = c.componente as Record<string, unknown> | undefined
          return {
            criterioId: (c.criterioId as string) ?? (criterio?.id as string) ?? '',
            criterioNome: (c.criterioNome as string) ?? (criterio?.nome as string) ?? '',
            complexidadeId: (c.complexidadeId as string) ?? (complexidade?.id as string) ?? '',
            complexidadeNome: (c.complexidadeNome as string) ?? (complexidade?.nome as string) ?? '',
            componenteId: (c.componenteId as string) ?? (componente?.id as string) ?? null,
            componenteNome: (c.componenteNome as string) ?? (componente?.nome as string) ?? null,
            esforcoHoras: (c.valorEsforco as number) ?? (c.esforcoHoras as number) ?? 0,
            fonte: (c.fonte as 'IA' | 'MANUAL') ?? 'IA',
            confianca: c.confianca as number | undefined,
          }
        })

        const rows: CriterioRow[] = await Promise.all(
          rawCriterios.map(async (c) => {
            const complexidades = await ensureComplexidades(c.criterioId)
            return {
              ...c,
              modified: false,
              complexidades,
            }
          })
        )
        setCriterios(rows)
      }

      setStep('review')
    } catch {
      setFormError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 2: Change complexidade ──────────────────────────────────────────

  const handleComplexidadeChange = (criterioId: string, newComplexidadeId: string) => {
    setCriterios((prev) =>
      prev.map((row) => {
        if (row.criterioId !== criterioId) return row
        const found = row.complexidades.find((c) => c.id === newComplexidadeId)
        return {
          ...row,
          complexidadeId: newComplexidadeId,
          complexidadeNome: found?.nome ?? row.complexidadeNome,
          esforcoHoras: found?.esforcoHoras ?? row.esforcoHoras,
          fonte: 'MANUAL',
          modified: true,
        }
      })
    )
  }

  // ─── Step 2: Remove criterio ──────────────────────────────────────────────

  const handleRemoveCriterio = async (criterioId: string) => {
    if (!solicitacaoId) return
    setLoadingAction(`remove-${criterioId}`)
    try {
      const res = await fetch(`/api/solicitacoes/${solicitacaoId}/criterios`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criterioId }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Erro ao remover critério.')
        return
      }
      setCriterios((prev) => prev.filter((c) => c.criterioId !== criterioId))
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoadingAction(null)
    }
  }

  // ─── Step 2: Add manual criterio ──────────────────────────────────────────

  const handleAddManualCriterio = async () => {
    if (!solicitacaoId || !manualCriterioId || !manualComplexidadeId) return
    setLoadingAction('add-manual')
    setError(null)
    try {
      const res = await fetch(`/api/solicitacoes/${solicitacaoId}/criterios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criterioId: manualCriterioId,
          complexidadeId: manualComplexidadeId,
          componenteId: manualComponenteId || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Erro ao adicionar critério.')
        return
      }
      // Build the new row
      const selectedCriterio = availableCriterios.find((c) => c.id === manualCriterioId)
      const selectedComplexidade = manualComplexidades.find((c) => c.id === manualComplexidadeId)
      const selectedComponente = componentes.find((c) => c.id === manualComponenteId)
      const complexidades = [...manualComplexidades]

      const newRow: CriterioRow = {
        criterioId: manualCriterioId,
        criterioNome: selectedCriterio?.nome ?? manualCriterioId,
        complexidadeId: manualComplexidadeId,
        complexidadeNome: selectedComplexidade?.nome ?? manualComplexidadeId,
        componenteId: manualComponenteId || null,
        componenteNome: selectedComponente?.nome ?? null,
        esforcoHoras: json.valorEsforco ?? selectedComplexidade?.esforcoHoras ?? 0,
        fonte: 'MANUAL',
        modified: false,
        complexidades,
      }
      setCriterios((prev) => [...prev, newRow])
      setManualComponenteId('')
      setManualCriterioId('')
      setManualComplexidadeId('')
      setManualComplexidades([])
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoadingAction(null)
    }
  }

  // ─── Step 2: Recalculate ──────────────────────────────────────────────────

  const handleRecalcular = async () => {
    if (!solicitacaoId) return
    setLoadingAction('recalcular')
    setError(null)
    try {
      // First, persist any modified rows via PUT/re-add
      const modifiedRows = criterios.filter((c) => c.modified)
      for (const row of modifiedRows) {
        await fetch(`/api/solicitacoes/${solicitacaoId}/criterios`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ criterioId: row.criterioId }),
        })
        await fetch(`/api/solicitacoes/${solicitacaoId}/criterios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ criterioId: row.criterioId, complexidadeId: row.complexidadeId, componenteId: row.componenteId }),
        })
      }

      const res = await fetch(`/api/solicitacoes/${solicitacaoId}/recalcular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Erro ao recalcular.')
        return
      }
      setEsforcoTotal(json.esforcoTotal ?? 0)

      // Update rows from recalculate response, preserving complexidades cache
      const rawCriterios: Array<{
        criterioId: string
        criterioNome: string
        complexidadeId: string
        complexidadeNome: string
        componenteId: string | null
        componenteNome: string | null
        esforcoHoras: number
        fonte: 'IA' | 'MANUAL'
        confianca?: number
      }> = (json.criterios ?? []).map((c: Record<string, unknown>) => {
        const criterio = c.criterio as Record<string, unknown> | undefined
        const complexidade = c.complexidade as Record<string, unknown> | undefined
        const componente = c.componente as Record<string, unknown> | undefined
        return {
          criterioId: (c.criterioId as string) ?? (criterio?.id as string) ?? '',
          criterioNome: (c.criterioNome as string) ?? (criterio?.nome as string) ?? '',
          complexidadeId: (c.complexidadeId as string) ?? (complexidade?.id as string) ?? '',
          complexidadeNome: (c.complexidadeNome as string) ?? (complexidade?.nome as string) ?? '',
          componenteId: (c.componenteId as string) ?? (componente?.id as string) ?? null,
          componenteNome: (c.componenteNome as string) ?? (componente?.nome as string) ?? null,
          esforcoHoras: (c.valorEsforco as number) ?? (c.esforcoHoras as number) ?? 0,
          fonte: (c.fonte as 'IA' | 'MANUAL') ?? 'IA',
          confianca: c.confianca as number | undefined,
        }
      })

      const rows: CriterioRow[] = await Promise.all(
        rawCriterios.map(async (c) => {
          const existing = criterios.find((r) => r.criterioId === c.criterioId)
          const complexidades = existing?.complexidades.length
            ? existing.complexidades
            : await ensureComplexidades(c.criterioId)
          return { ...c, modified: false, complexidades }
        })
      )
      setCriterios(rows)
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoadingAction(null)
    }
  }

  // ─── Step 2 → Modal ───────────────────────────────────────────────────────

  const handleAprovarClick = () => {
    setGainError(null)
    setTipoGanho('')
    setValorGanho('')
    setDescricaoPremissa('')
    setShowGainModal(true)
  }

  // ─── Modal: Confirm ───────────────────────────────────────────────────────

  const handleConfirmGain = async () => {
    setGainError(null)
    if (!tipoGanho) { setGainError('Selecione o tipo de ganho.'); return }
    const valorNum = parseFloat(valorGanho)
    if (!valorGanho || isNaN(valorNum) || valorNum <= 0) {
      setGainError('Informe um valor positivo.')
      return
    }
    if (!solicitacaoId) return
    setLoadingAction('confirmar-ganho')
    try {
      const aprovarRes = await fetch(`/api/solicitacoes/${solicitacaoId}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!aprovarRes.ok) {
        const json = await aprovarRes.json()
        setGainError(json.error ?? 'Erro ao aprovar esforço.')
        return
      }

      const backlogRes = await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitacaoId,
          tipoGanho,
          valorGanho: valorNum,
          descricaoPremissa: descricaoPremissa.trim() || null,
        }),
      })
      if (!backlogRes.ok) {
        const json = await backlogRes.json()
        setGainError(json.error ?? 'Erro ao enviar ao backlog.')
        return
      }

      const tipoOption = TIPO_GANHO_OPTIONS.find((o) => o.value === tipoGanho)
      setSuccessData({
        titulo,
        esforco: esforcoTotal,
        tipoGanho: tipoOption?.label ?? tipoGanho,
        valorGanho,
        unit: tipoOption?.unit ?? '',
      })
      setShowGainModal(false)
      setStep('success')
    } catch {
      setGainError('Erro de conexão.')
    } finally {
      setLoadingAction(null)
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  const handleNovaSolicitacao = () => {
    setStep('form')
    setSolicitacaoId(null)
    setTitulo('')
    setDescricao('')
    setSolicitante('')
    setAreaSolicitante('')
    setAreaId('')
    setContexto('')
    setUrgencia('')
    setCriterios([])
    setAvailableCriterios([])
    setAnalise(null)
    setEsforcoTotal(0)
    setManualComponenteId('')
    setManualCriterioId('')
    setManualComplexidadeId('')
    setManualComplexidades([])
    setError(null)
    setFormError(null)
    setSuccessData(null)
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const criteriosJaAdicionados = new Set(criterios.map((c) => c.criterioId))
  const criteriosDisponiveis = availableCriterios.filter((c) => !criteriosJaAdicionados.has(c.id))
  const selectedTipoOption = TIPO_GANHO_OPTIONS.find((o) => o.value === tipoGanho)

  // ─── Render: Step 1 (Form) ────────────────────────────────────────────────

  if (step === 'form') {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Nova Solicitação</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Descreva sua demanda e a IA estimará o esforço automaticamente.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-20 shadow-sm gap-4">
            <LoadingSpinner size="lg" label="Analisando solicitação com IA..." />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Analisando solicitação com IA...</p>
            <p className="text-xs text-gray-400">Isso pode levar alguns segundos.</p>
          </div>
        ) : (
          <form onSubmit={handleCreateAndAnalyze} noValidate className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Dados da Solicitação</h2>
            </div>
            <div className="px-6 py-5 space-y-5">
              {formError && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                  {formError}
                </div>
              )}

              {/* Título */}
              <div>
                <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  id="titulo"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={200}
                  placeholder="Ex.: Automação do processo de aprovação de contratos"
                  className="mt-1.5 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Descrição */}
              <div>
                <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={5}
                  placeholder="Descreva detalhadamente o que precisa ser feito, o problema a resolver e o resultado esperado..."
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-y dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                />
              </div>

              {/* Solicitante */}
              <div>
                <label htmlFor="solicitante" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Solicitante
                  <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  id="solicitante"
                  type="text"
                  value={solicitante}
                  onChange={(e) => setSolicitante(e.target.value)}
                  maxLength={100}
                  placeholder="Ex.: João Silva"
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                />
              </div>

              {/* Área Solicitante */}
              <div>
                <label htmlFor="areaSolicitante" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Área Solicitante
                  <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  id="areaSolicitante"
                  type="text"
                  value={areaSolicitante}
                  onChange={(e) => setAreaSolicitante(e.target.value)}
                  maxLength={100}
                  placeholder="Ex: Comercial, Financeiro, RH"
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                />
              </div>

              {/* Área Técnica */}
              <div>
                <label htmlFor="area" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Área Técnica <span className="text-red-500">*</span>
                </label>
                <select
                  id="area"
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Selecione a área</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </div>

              {/* Contexto */}
              <div>
                <label htmlFor="contexto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contexto adicional
                  <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  id="contexto"
                  value={contexto}
                  onChange={(e) => setContexto(e.target.value)}
                  rows={3}
                  placeholder="Informações de contexto que podem ajudar a IA a fazer uma análise mais precisa..."
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-y dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                />
              </div>

              {/* Urgência */}
              <div>
                <label htmlFor="urgencia" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Urgência
                  <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
                </label>
                <select
                  id="urgencia"
                  value={urgencia}
                  onChange={(e) => setUrgencia(e.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {URGENCIA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
                </svg>
                Criar e Analisar com IA
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  // ─── Render: Step 4 (Success) ─────────────────────────────────────────────

  if (step === 'success' && successData) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="bg-green-50 dark:bg-green-900/30 px-6 py-8 flex flex-col items-center text-center border-b border-green-100 dark:border-green-800">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-900 dark:text-green-200">Demanda enviada ao backlog com sucesso!</h2>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">O esforço foi aprovado e a demanda está pronta para priorização.</p>
          </div>

          <div className="px-6 py-5 space-y-3">
            <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Título</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-xs">{successData.titulo}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Esforço aprovado</span>
              <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">{successData.esforco} horas</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Tipo de ganho</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{successData.tipoGanho}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Valor do ganho</span>
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                {successData.unit === 'R$' ? `R$ ${parseFloat(successData.valorGanho).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `${successData.valorGanho} ${successData.unit}`}
              </span>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => router.push('/backlog')}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              Ver no Backlog
            </button>
            <button
              onClick={handleNovaSolicitacao}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Nova Solicitação
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: Step 2 (Review) ──────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Memória de Cálculo</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Revise os critérios identificados, ajuste complexidades e aprove o esforço.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 dark:bg-teal-900/40 px-3 py-1 text-xs font-medium text-teal-700 dark:text-teal-300 self-start sm:self-auto">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {titulo}
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* AI Analysis Box */}
      {analise && (
        <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
              </svg>
              <span className="text-sm font-semibold text-teal-900 dark:text-teal-200">Análise automática da IA</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-teal-700 dark:text-teal-300">Confiança geral:</span>
              <ConfidenceBadge confidence={analise.confiancaGeral} />
            </div>
          </div>
          <p className="text-sm text-teal-800 dark:text-teal-300 leading-relaxed">{analise.observacoes}</p>
        </div>
      )}

      {/* Criteria Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Critérios Identificados</h2>
          <span className="text-xs text-gray-400">{criterios.length} critério{criterios.length !== 1 ? 's' : ''}</span>
        </div>

        {criterios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Nenhum critério identificado. Adicione manualmente abaixo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Componente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Critério</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Complexidade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Esforço (h)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Fonte</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Confiança</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {criterios.map((row) => (
                  <tr
                    key={row.criterioId}
                    className={
                      row.modified
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-l-yellow-400'
                        : row.fonte === 'IA'
                        ? 'border-l-4 border-l-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        : 'border-l-4 border-l-green-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  >
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {row.componenteNome ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                          {row.componenteNome}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.criterioNome}</td>
                    <td className="px-4 py-3">
                      {row.complexidades.length > 0 ? (
                        <select
                          value={row.complexidadeId}
                          onChange={(e) => handleComplexidadeChange(row.criterioId, e.target.value)}
                          aria-label={`Complexidade de ${row.criterioNome}`}
                          className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          {row.complexidades.map((c) => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-700 dark:text-gray-300">{row.complexidadeNome}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{row.esforcoHoras}h</td>
                    <td className="px-4 py-3">
                      <SourceBadge source={row.modified ? 'MANUAL' : row.fonte} />
                    </td>
                    <td className="px-4 py-3">
                      {!row.modified && row.fonte === 'IA' && row.confianca != null ? (
                        <ConfidenceBadge confidence={row.confianca} />
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemoveCriterio(row.criterioId)}
                        disabled={loadingAction === `remove-${row.criterioId}`}
                        aria-label={`Remover ${row.criterioNome}`}
                        className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 focus:outline-none focus:ring-1 focus:ring-red-300 disabled:opacity-40"
                      >
                        {loadingAction === `remove-${row.criterioId}` ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Manual Criterio */}
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Adicionar Critério Manual</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="manual-componente" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Componente</label>
              <select
                id="manual-componente"
                value={manualComponenteId}
                onChange={(e) => setManualComponenteId(e.target.value)}
                className="block w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Sem componente</option>
                {componentes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="manual-criterio" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Critério</label>
              <select
                id="manual-criterio"
                value={manualCriterioId}
                onChange={(e) => setManualCriterioId(e.target.value)}
                className="block w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Selecione um critério</option>
                {criteriosDisponiveis.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="manual-complexidade" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Complexidade</label>
              <select
                id="manual-complexidade"
                value={manualComplexidadeId}
                onChange={(e) => setManualComplexidadeId(e.target.value)}
                disabled={!manualCriterioId || manualComplexidades.length === 0}
                className="block w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
              >
                <option value="">
                  {!manualCriterioId
                    ? 'Selecione um critério primeiro'
                    : manualComplexidades.length === 0
                    ? 'Carregando...'
                    : 'Selecione a complexidade'}
                </option>
                {manualComplexidades.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome} — {c.esforcoHoras}h</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={handleAddManualCriterio}
                disabled={!manualCriterioId || !manualComplexidadeId || loadingAction === 'add-manual'}
                className="inline-flex items-center gap-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAction === 'add-manual' ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
                Adicionar Critério
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Esforço Total + Actions */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Esforço Total Estimado</p>
            <p className="mt-1 text-4xl font-bold text-gray-900 dark:text-white">
              {esforcoTotal}
              <span className="ml-2 text-xl font-medium text-gray-500">horas</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">(baseado nos critérios acima)</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRecalcular}
              disabled={loadingAction === 'recalcular'}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loadingAction === 'recalcular' ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Recalcular Esforço
            </button>

            <button
              type="button"
              onClick={handleAprovarClick}
              disabled={criterios.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Aprovar Esforço
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-300"></span>
          Sugerido pela IA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-300"></span>
          Adicionado manualmente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-yellow-300"></span>
          Complexidade modificada
        </span>
      </div>

      {/* Gain Modal */}
      {showGainModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gain-modal-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-2xl">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-5">
              <h2 id="gain-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Ganho Esperado
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Informe o retorno esperado desta demanda para enviar ao backlog.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {gainError && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                  {gainError}
                </div>
              )}

              {/* Tipo de Ganho */}
              <div>
                <label htmlFor="tipo-ganho" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipo de ganho <span className="text-red-500">*</span>
                </label>
                <select
                  id="tipo-ganho"
                  value={tipoGanho}
                  onChange={(e) => setTipoGanho(e.target.value as TipoGanho)}
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Selecione o tipo de ganho</option>
                  {TIPO_GANHO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Valor do Ganho */}
              <div>
                <label htmlFor="valor-ganho" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Valor do ganho <span className="text-red-500">*</span>
                </label>
                <div className="mt-1.5 flex rounded-md shadow-sm">
                  {selectedTipoOption && (
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 text-sm text-gray-500 dark:text-gray-400">
                      {selectedTipoOption.unit}
                    </span>
                  )}
                  <input
                    id="valor-ganho"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={valorGanho}
                    onChange={(e) => setValorGanho(e.target.value)}
                    placeholder="0"
                    className={`block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 ${selectedTipoOption ? 'rounded-r-md' : 'rounded-md'}`}
                  />
                </div>
              </div>

              {/* Descrição da Premissa */}
              <div>
                <label htmlFor="descricao-premissa" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrição da premissa
                  <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  id="descricao-premissa"
                  value={descricaoPremissa}
                  onChange={(e) => setDescricaoPremissa(e.target.value)}
                  rows={3}
                  placeholder="Explique a premissa usada para calcular esse ganho esperado..."
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-y dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowGainModal(false)}
                disabled={loadingAction === 'confirmar-ganho'}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmGain}
                disabled={loadingAction === 'confirmar-ganho'}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loadingAction === 'confirmar-ganho' ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Confirmar e Enviar ao Backlog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
