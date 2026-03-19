'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface BacklogItem {
  id: string
  posicao: number
  scorePriorizacao: number
  status: string
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

interface KpiData {
  totalDemandas: number
  esforcoTotalBacklog: number
  demandasPriorizadas: number
  scoreMedio: number
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<KpiData>({
    totalDemandas: 0,
    esforcoTotalBacklog: 0,
    demandasPriorizadas: 0,
    scoreMedio: 0,
  })
  const [top5, setTop5] = useState<BacklogItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const backlogRes = await fetch('/api/backlog')
        const backlog: BacklogItem[] = await backlogRes.json()

        const items = Array.isArray(backlog) ? backlog : []
        const totalDemandas = items.length

        const esforcoTotalBacklog = items.reduce(
          (sum, item) => sum + (item.solicitacao?.esforcoTotal ?? 0),
          0
        )

        const scoreMedio =
          totalDemandas > 0
            ? items.reduce((sum, item) => sum + (item.scorePriorizacao ?? 0), 0) / totalDemandas
            : 0

        setKpi({ totalDemandas, esforcoTotalBacklog, demandasPriorizadas: totalDemandas, scoreMedio })
        setTop5(items.slice(0, 5))
      } catch {
        setError('Erro ao carregar dados do dashboard.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Carregando dashboard..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-300">
        {error}
      </div>
    )
  }

  const kpiCards = [
    {
      label: 'Total de Demandas',
      value: kpi.totalDemandas.toString(),
      description: 'demandas no backlog',
      borderColor: 'border-blue-500',
      valueColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Esforço Total do Backlog',
      value: `${kpi.esforcoTotalBacklog.toLocaleString('pt-BR')}h`,
      description: 'horas estimadas no backlog',
      borderColor: 'border-orange-500',
      valueColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Demandas Priorizadas',
      value: kpi.demandasPriorizadas.toString(),
      description: 'itens no backlog',
      borderColor: 'border-teal-500',
      valueColor: 'text-teal-600 dark:text-teal-400',
    },
    {
      label: 'Score Médio',
      value: kpi.scoreMedio.toFixed(2),
      description: 'score de priorização médio',
      borderColor: 'border-gray-400',
      valueColor: 'text-gray-900 dark:text-white',
    },
  ]

  const positionLabel = (pos: number) => {
    if (pos === 1) return '🥇'
    if (pos === 2) return '🥈'
    if (pos === 3) return '🥉'
    return String(pos)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Visão geral das demandas e prioridades.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 border-l-4 ${card.borderColor}`}>
            <p className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</p>
            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">{card.label}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Ranking Criteria Explainer */}
      <details className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
        <summary className="flex items-center gap-2 cursor-pointer px-4 py-3 text-sm font-semibold text-teal-900 dark:text-teal-200">
          <svg className="w-5 h-5 text-teal-700 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Como funciona o Score de Priorização?
        </summary>
        <div className="px-4 pb-4 space-y-3 text-sm text-teal-800 dark:text-teal-300">
          <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-teal-100 dark:border-teal-700">
            <p className="font-mono font-semibold text-center text-base">Score = Ganho Normalizado / Esforço Total (h)</p>
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
          </p>
        </div>
      </details>

      {/* Top 5 Priorities */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Top 5 Prioridades</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">As demandas com maior score de priorização.</p>

        {top5.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
            <p className="text-sm">Nenhum item no backlog ainda.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Pos.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Título
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Solicitante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Área Solicitante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Área Técnica
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {top5.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {positionLabel(item.posicao)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">
                      {item.solicitacao?.titulo ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.solicitacao?.solicitante ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.solicitacao?.areaSolicitante ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {item.solicitacao?.area?.nome ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                      {item.scorePriorizacao?.toFixed(2) ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={item.status as Parameters<typeof StatusBadge>[0]['status']}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
