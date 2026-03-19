interface Props {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
}

export function LoadingSpinner({ size = 'md', label = 'Carregando...' }: Props) {
  return (
    <div className="flex items-center justify-center gap-2" role="status" aria-label={label}>
      <div
        className={`${sizeClasses[size]} rounded-full border-gray-200 dark:border-gray-600 border-t-teal-600 animate-spin`}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
