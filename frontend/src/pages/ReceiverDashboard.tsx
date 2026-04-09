/**
 * Dashboard para RECEIVER (Don Alex).
 * Diseñado para accesibilidad en adultos mayores:
 * - Texto más grande
 * - Botones prominentes con alto contraste
 * - Lenguaje sencillo y directo
 * - Secciones bien separadas
 */
import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { RequestForm } from '../components/transactions/RequestForm'
import { TransactionList } from '../components/transactions/TransactionList'
import { SkeletonCard } from '../components/ui/Skeleton'
import { Pagination } from '../components/ui/Pagination'
import { useAuthStore } from '../store/authStore'
import type { Transaction } from '../types'

const TABLE_LIMIT = 8

function computeReceiverStats(txs: Transaction[]) {
  const received  = txs.filter((t) => t.transaction_type === 'SEND')
  const pending   = received.filter((t) => t.status === 'PENDING')
  const totalGTQ  = received
    .filter((t) => t.status === 'COMPLETED' && t.amount_gtq)
    .reduce((sum, t) => sum + parseFloat(t.amount_gtq!), 0)
  return { totalReceived: received.length, pendingCount: pending.length, totalGTQ }
}

export default function ReceiverDashboard() {
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [tableOffset, setTableOffset] = useState(0)

  const txData = useTransactions(TABLE_LIMIT, tableOffset)
  const allTx  = useTransactions(100, 0)  // para estadísticas

  const stats = computeReceiverStats(allTx.data?.items ?? [])
  const pendingList = (allTx.data?.items ?? []).filter(
    (tx) => tx.transaction_type === 'SEND' && tx.status === 'PENDING',
  )

  const handleConfirmed = () => {
    txData.refetch()
    allTx.refetch()
  }

  const handleRequestSuccess = () => {
    setShowForm(false)
    txData.refetch()
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">

      {/* Bienvenida */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {user?.username} 👋
        </h1>
        <p className="text-lg text-gray-500 mt-1">Aquí puede ver y gestionar su dinero</p>
      </div>

      {/* Estadísticas grandes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {allTx.isLoading ? (
          [0, 1, 2].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <BigStatCard label="Total recibido (GTQ)" value={`Q${stats.totalGTQ.toFixed(2)}`} color="text-emerald-600" />
            <BigStatCard label="Transferencias" value={String(stats.totalReceived)} color="text-gray-900" />
            <BigStatCard
              label="Por confirmar"
              value={String(stats.pendingCount)}
              color={stats.pendingCount > 0 ? 'text-amber-600' : 'text-gray-400'}
            />
          </>
        )}
      </div>

      {/* Remesas pendientes por confirmar */}
      {(pendingList.length > 0 || allTx.isLoading) && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-xl font-bold text-gray-800">
              Dinero esperando su confirmación
            </h2>
          </div>
          <p className="text-base text-gray-500">
            Su hijo le envió dinero. Pulse <strong>"Confirmar"</strong> para recibirlo.
          </p>
          <TransactionList
            transactions={pendingList}
            isLoading={allTx.isLoading}
            onConfirmed={handleConfirmed}
            large
            emptyMessage="No hay remesas pendientes."
          />
        </section>
      )}

      {/* Botón / formulario de solicitud */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Pedir dinero</h2>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-6 text-xl font-bold text-white bg-emerald-600
              hover:bg-emerald-700 rounded-2xl shadow-md transition-colors
              flex items-center justify-center gap-3"
          >
            💸 Solicitar Dinero
          </button>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-5">
              ¿Cuánto necesita?
            </h3>
            <RequestForm
              onSuccess={handleRequestSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
      </section>

      {/* Historial completo */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Mi historial</h2>
        <TransactionList
          transactions={txData.data?.items ?? []}
          isLoading={txData.isLoading}
          onConfirmed={handleConfirmed}
          large
          emptyMessage="Aún no tienes transacciones."
        />
        {txData.data && (
          <Pagination
            total={txData.data.total}
            limit={TABLE_LIMIT}
            offset={tableOffset}
            onOffsetChange={setTableOffset}
            isLoading={txData.isLoading}
            largeText
          />
        )}
      </section>
    </div>
  )
}

function BigStatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <p className="text-base text-gray-500">{label}</p>
      <p className={`text-4xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  )
}
