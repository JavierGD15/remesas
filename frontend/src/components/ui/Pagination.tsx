interface Props {
  total: number
  limit: number
  offset: number
  onOffsetChange: (newOffset: number) => void
  isLoading?: boolean
  largeText?: boolean
}

export function Pagination({ total, limit, offset, onOffsetChange, isLoading, largeText }: Props) {
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const hasPrev = offset > 0
  const hasNext = offset + limit < total
  const base = largeText ? 'text-base' : 'text-sm'

  return (
    <div className={`flex items-center justify-between px-1 ${base}`}>
      <span className="text-gray-500">
        {total === 0
          ? 'Sin resultados'
          : `Página ${currentPage} de ${totalPages} · ${total} registros`}
      </span>

      <div className="flex gap-2">
        <button
          onClick={() => onOffsetChange(offset - limit)}
          disabled={!hasPrev || isLoading}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700
            hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Anterior
        </button>
        <button
          onClick={() => onOffsetChange(offset + limit)}
          disabled={!hasNext || isLoading}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700
            hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
