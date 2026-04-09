// ── Primitivo ──────────────────────────────────────────────────────────────────
function Box({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
}

// ── Tarjeta de estadística ─────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
      <Box className="h-4 w-1/3" />
      <Box className="h-8 w-1/2" />
    </div>
  )
}

// ── Fila de tabla ──────────────────────────────────────────────────────────────
export function SkeletonTableRows({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 px-4 border-b border-gray-100 last:border-0">
          <Box className="h-4 w-16 shrink-0" />
          <Box className="h-4 flex-1" />
          <Box className="h-4 w-20 shrink-0" />
          <Box className="h-4 w-24 shrink-0" />
          <Box className="h-6 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </>
  )
}

// ── Área de gráfico ────────────────────────────────────────────────────────────
export function SkeletonChart() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex justify-between items-center">
        <Box className="h-5 w-40" />
        <Box className="h-8 w-32 rounded-lg" />
      </div>
      <Box className="h-56 w-full rounded-lg" />
    </div>
  )
}
