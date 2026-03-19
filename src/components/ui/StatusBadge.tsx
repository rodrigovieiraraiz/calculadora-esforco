type Status =
  | 'NOVO'
  | 'ESTIMADO'
  | 'APROVADO'
  | 'NAO_INICIADO'
  | 'PRIORIZADO'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDO'
  | 'CANCELADO'

const statusConfig: Record<Status, { label: string; className: string }> = {
  NOVO: {
    label: 'Novo',
    className: 'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600',
  },
  ESTIMADO: {
    label: 'Estimado',
    className: 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-800',
  },
  APROVADO: {
    label: 'Aprovado',
    className: 'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800',
  },
  NAO_INICIADO: {
    label: 'Não Iniciado',
    className: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
  },
  PRIORIZADO: {
    label: 'Priorizado',
    className: 'bg-teal-100 text-teal-700 ring-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:ring-teal-800',
  },
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    className: 'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:ring-orange-800',
  },
  CONCLUIDO: {
    label: 'Concluído',
    className: 'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800',
  },
  CANCELADO: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800',
  },
}

interface Props {
  status: Status
}

export function StatusBadge({ status }: Props) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600' }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  )
}
