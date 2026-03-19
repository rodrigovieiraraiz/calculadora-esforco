interface Props {
  confidence: number
}

function getConfig(value: number): { barClass: string; textClass: string; bgClass: string } {
  if (value >= 0.8) {
    return {
      barClass: 'bg-green-500',
      textClass: 'text-green-700 dark:text-green-300',
      bgClass: 'bg-green-100 dark:bg-green-900/40',
    }
  }
  if (value >= 0.6) {
    return {
      barClass: 'bg-yellow-500',
      textClass: 'text-yellow-700 dark:text-yellow-300',
      bgClass: 'bg-yellow-100 dark:bg-yellow-900/40',
    }
  }
  return {
    barClass: 'bg-red-500',
    textClass: 'text-red-700 dark:text-red-300',
    bgClass: 'bg-red-100 dark:bg-red-900/40',
  }
}

export function ConfidenceBadge({ confidence }: Props) {
  const clamped = Math.min(1, Math.max(0, confidence))
  const percentage = Math.round(clamped * 100)
  const { barClass, textClass, bgClass } = getConfig(clamped)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${bgClass} ${textClass}`}
      title={`Confiança: ${percentage}%`}
    >
      <span className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <span
          className={`block h-full rounded-full ${barClass}`}
          style={{ width: `${percentage}%` }}
        />
      </span>
      {percentage}%
    </span>
  )
}
