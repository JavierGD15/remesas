import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { SkeletonChart } from '../ui/Skeleton'
import type { Transaction } from '../../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

interface ChartPoint {
  date: string       // YYYY-MM-DD — clave de agrupación
  label: string      // fecha formateada para el eje X
  amount_usd: number
  amount_gtq: number
  count: number
}

function buildChartData(txs: Transaction[]): ChartPoint[] {
  const completed = txs.filter(
    (tx) =>
      tx.status === 'COMPLETED' &&
      tx.amount_usd !== null &&
      tx.amount_gtq !== null,
  )

  const map = new Map<string, ChartPoint>()

  for (const tx of completed) {
    // Normalizar a fecha local sin hora
    const date = tx.created_at.split('T')[0]
    const usd = parseFloat(tx.amount_usd ?? '0')
    const gtq = parseFloat(tx.amount_gtq ?? '0')
    const existing = map.get(date)

    if (existing) {
      map.set(date, {
        ...existing,
        amount_usd: existing.amount_usd + usd,
        amount_gtq: existing.amount_gtq + gtq,
        count: existing.count + 1,
      })
    } else {
      const [year, month, day] = date.split('-')
      const label = `${day}/${month}/${year?.slice(2)}`
      map.set(date, { date, label, amount_usd: usd, amount_gtq: gtq, count: 1 })
    }
  }

  // Orden cronológico para el gráfico
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// ── Tooltip personalizado ──────────────────────────────────────────────────────

type Currency = 'USD' | 'GTQ'

function CustomTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ChartPoint

  return (
    <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-4 text-sm min-w-[180px]">
      <p className="font-semibold text-gray-700 mb-2">{d.label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">USD</span>
          <span className="font-medium text-indigo-600">${d.amount_usd.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">GTQ</span>
          <span className="font-medium text-emerald-600">Q{d.amount_gtq.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-gray-100 mt-1">
          <span className="text-gray-400 text-xs">Transacciones</span>
          <span className="text-gray-600 text-xs font-medium">{d.count}</span>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

interface TrendChartProps {
  transactions: Transaction[]
  isLoading?: boolean
}

const CURRENCY_CONFIG: Record<Currency, { key: 'amount_usd' | 'amount_gtq'; color: string; stroke: string; symbol: string; label: string }> = {
  USD: { key: 'amount_usd', color: '#e0e7ff', stroke: '#4f46e5', symbol: '$', label: 'USD' },
  GTQ: { key: 'amount_gtq', color: '#d1fae5', stroke: '#10b981', symbol: 'Q', label: 'GTQ' },
}

export function TrendChart({ transactions, isLoading = false }: TrendChartProps) {
  const [currency, setCurrency] = useState<Currency>('USD')
  const cfg = CURRENCY_CONFIG[currency]
  const data = buildChartData(transactions)

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <SkeletonChart />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Tendencia de remesas</h2>
          <p className="text-xs text-gray-400 mt-0.5">Montos diarios de transacciones completadas</p>
        </div>

        {/* Selector de moneda */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          {(['USD', 'GTQ'] as Currency[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currency === c
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-sm text-gray-400">
          No hay transacciones completadas para mostrar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${currency}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={cfg.stroke} stopOpacity={0.2} />
                <stop offset="95%" stopColor={cfg.stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${cfg.symbol}${v}`}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={cfg.key}
              stroke={cfg.stroke}
              strokeWidth={2.5}
              fill={`url(#grad-${currency})`}
              dot={{ r: 3, fill: cfg.stroke, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: cfg.stroke, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
