import { useState } from 'react'
import axios from 'axios'
import { transactionsApi } from '../../api/transactions'
import { useToastStore } from '../../store/toastStore'
import { SkeletonTableRows } from '../ui/Skeleton'
import type { Transaction, TransactionStatus, TransactionType } from '../../types'

// ── Badges ────────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<TransactionStatus, string> = {
  PENDING:   'bg-amber-100  text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
}
const STATUS_LABEL: Record<TransactionStatus, string> = {
  PENDING: 'Pendiente', COMPLETED: 'Completado',
}
const TYPE_STYLE: Record<TransactionType, string> = {
  SEND:    'bg-blue-100   text-blue-700',
  REQUEST: 'bg-purple-100 text-purple-700',
}
const TYPE_LABEL: Record<TransactionType, string> = {
  SEND: 'Envío', REQUEST: 'Solicitud',
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fUSD  = (v: string | null) => v ? `$${parseFloat(v).toFixed(2)}` : '—'
const fGTQ  = (v: string | null) => v ? `Q${parseFloat(v).toFixed(2)}` : '—'
const fRate = (v: string | null) => v ? parseFloat(v).toFixed(4) : '—'
const fDate = (s: string) =>
  new Date(s).toLocaleDateString('es-GT', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  transactions: Transaction[]
  isLoading: boolean
  /** Si se pasa, las tx PENDING con type=SEND mostrarán botón de confirmar */
  onConfirmed?: () => void
  /** Para el dashboard del RECEIVER: texto e inputs más grandes */
  large?: boolean
  emptyMessage?: string
}

// ── Componente ────────────────────────────────────────────────────────────────

export function TransactionList({
  transactions,
  isLoading,
  onConfirmed,
  large = false,
  emptyMessage = 'No hay transacciones.',
}: Props) {
  const toast = useToastStore((s) => s.toast)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const handleConfirm = async (id: number) => {
    setConfirmingId(id)
    try {
      await transactionsApi.confirm(id)
      toast('¡Remesa confirmada! El tipo de cambio fue bloqueado.', 'success')
      onConfirmed?.()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const detail = err.response?.data?.detail as string | undefined
        if (status === 503) {
          toast('El servicio de tipo de cambio no está disponible. Intenta en unos minutos.', 'error')
        } else {
          toast(detail ?? 'Error al confirmar la transacción', 'error')
        }
      } else {
        toast('Error inesperado al confirmar', 'error')
      }
    } finally {
      setConfirmingId(null)
    }
  }

  const textSm   = large ? 'text-base'  : 'text-sm'
  const textXs   = large ? 'text-sm'    : 'text-xs'
  const cellPy   = large ? 'py-5'       : 'py-3'
  const badgePx  = large ? 'px-3 py-1'  : 'px-2 py-0.5'

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <SkeletonTableRows rows={large ? 3 : 4} />
      </div>
    )
  }

  if (!transactions.length) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm py-12 text-center ${textSm} text-gray-400`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className={`w-full ${textSm}`}>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['#', 'Tipo', 'Estado', 'USD', 'GTQ', 'Tasa', 'Motivo', 'Fecha', ...(onConfirmed ? ['Acción'] : [])].map((h) => (
                <th key={h} className={`${cellPy} px-4 text-left font-semibold text-gray-600 ${textXs} uppercase tracking-wide`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const canConfirm = onConfirmed && tx.status === 'PENDING' && tx.transaction_type === 'SEND'
              const isConfirming = confirmingId === tx.id
              return (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className={`${cellPy} px-4 text-gray-400 font-mono`}>{tx.id}</td>
                  <td className={`${cellPy} px-4`}>
                    <span className={`${badgePx} rounded-full font-medium ${textXs} ${TYPE_STYLE[tx.transaction_type]}`}>
                      {TYPE_LABEL[tx.transaction_type]}
                    </span>
                  </td>
                  <td className={`${cellPy} px-4`}>
                    <span className={`${badgePx} rounded-full font-medium ${textXs} ${STATUS_STYLE[tx.status]}`}>
                      {STATUS_LABEL[tx.status]}
                    </span>
                  </td>
                  <td className={`${cellPy} px-4 font-medium text-indigo-700`}>{fUSD(tx.amount_usd)}</td>
                  <td className={`${cellPy} px-4 font-medium text-emerald-700`}>{fGTQ(tx.amount_gtq)}</td>
                  <td className={`${cellPy} px-4 text-gray-500 font-mono`}>{fRate(tx.exchange_rate)}</td>
                  <td className={`${cellPy} px-4 text-gray-500 max-w-[160px] truncate`} title={tx.motive ?? ''}>
                    {tx.motive ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className={`${cellPy} px-4 text-gray-400 whitespace-nowrap`}>{fDate(tx.created_at)}</td>
                  {onConfirmed && (
                    <td className={`${cellPy} px-4`}>
                      {canConfirm && (
                        <button
                          onClick={() => handleConfirm(tx.id)}
                          disabled={isConfirming}
                          className={`${large ? 'px-4 py-2.5 text-base' : 'px-3 py-1.5 text-sm'} font-semibold text-white
                            bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300
                            rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap`}
                        >
                          {isConfirming ? (
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : '✓'} Confirmar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {transactions.map((tx) => {
          const canConfirm = onConfirmed && tx.status === 'PENDING' && tx.transaction_type === 'SEND'
          const isConfirming = confirmingId === tx.id
          return (
            <div key={tx.id} className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLE[tx.transaction_type]}`}>
                    {TYPE_LABEL[tx.transaction_type]}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[tx.status]}`}>
                    {STATUS_LABEL[tx.status]}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{fDate(tx.created_at)}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-indigo-700 font-semibold">{fUSD(tx.amount_usd)}</span>
                <span className="text-emerald-700 font-semibold">{fGTQ(tx.amount_gtq)}</span>
              </div>
              {tx.motive && <p className="text-sm text-gray-500">{tx.motive}</p>}
              {canConfirm && (
                <button
                  onClick={() => handleConfirm(tx.id)}
                  disabled={isConfirming}
                  className="w-full mt-2 py-2 text-sm font-semibold text-white bg-emerald-600
                    hover:bg-emerald-700 disabled:bg-emerald-300 rounded-lg transition-colors"
                >
                  {isConfirming ? 'Confirmando...' : '✓ Confirmar recepción'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
