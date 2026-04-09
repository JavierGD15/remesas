import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { SendForm } from '../components/transactions/SendForm'
import { TransactionList } from '../components/transactions/TransactionList'
import { TrendChart } from '../components/charts/TrendChart'
import { SkeletonCard } from '../components/ui/Skeleton'
import { Pagination } from '../components/ui/Pagination'
import { useAuthStore } from '../store/authStore'
import type { Transaction } from '../types'

const TABLE_LIMIT = 10
const CHART_LIMIT = 100

// ── Estadísticas derivadas del fetch ─────────────────────────────────────────

function computeStats(txs: Transaction[]) {
  const sent     = txs.filter((t) => t.transaction_type === 'SEND')
  const pending  = sent.filter((t) => t.status === 'PENDING').length
  const totalUSD = sent
    .filter((t) => t.status === 'COMPLETED' && t.amount_usd)
    .reduce((sum, t) => sum + parseFloat(t.amount_usd!), 0)
  return { total: sent.length, pending, totalUSD }
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function SenderDashboard() {
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [tableOffset, setTableOffset] = useState(0)

  // Fetch separado para el gráfico (historial amplio)
  const chart = useTransactions(CHART_LIMIT, 0)
  // Fetch paginado para la tabla
  const table = useTransactions(TABLE_LIMIT, tableOffset)

  const stats = computeStats(chart.data?.items ?? [])

  const handleFormSuccess = () => {
    setShowForm(false)
    chart.refetch()
    table.refetch()
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard — Remitente</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bienvenido, {user?.username}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm
            font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
        >
          {showForm ? '✕ Cancelar' : '+ Nuevo envío'}
        </button>
      </div>

      {/* Formulario colapsable */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Registrar envío de remesa</h2>
          <SendForm
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {chart.isLoading ? (
          [0, 1, 2].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total enviado (USD)" value={`$${stats.totalUSD.toFixed(2)}`} color="text-indigo-600" />
            <StatCard label="Envíos realizados" value={String(stats.total)} color="text-gray-900" />
            <StatCard label="Pendientes" value={String(stats.pending)} color={stats.pending > 0 ? 'text-amber-600' : 'text-gray-400'} />
          </>
        )}
      </div>

      {/* Gráfico de tendencia */}
      <TrendChart
        transactions={chart.data?.items ?? []}
        isLoading={chart.isLoading}
      />

      {/* Tabla paginada */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Historial de transacciones</h2>
        <TransactionList
          transactions={table.data?.items ?? []}
          isLoading={table.isLoading}
          emptyMessage="Aún no has registrado envíos."
        />
        {table.data && (
          <Pagination
            total={table.data.total}
            limit={TABLE_LIMIT}
            offset={tableOffset}
            onOffsetChange={setTableOffset}
            isLoading={table.isLoading}
          />
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}
