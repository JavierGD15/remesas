import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types'

const ROLE_LABEL: Record<UserRole, string> = {
  SENDER: 'Remitente',
  RECEIVER: 'Receptor',
}

const SENDER_CARDS = [
  { label: 'Envíos pendientes', value: '—', color: 'text-amber-600' },
  { label: 'Total enviado (USD)', value: '—', color: 'text-blue-600' },
  { label: 'Equivalente (GTQ)', value: '—', color: 'text-indigo-600' },
]

const RECEIVER_CARDS = [
  { label: 'Solicitudes pendientes', value: '—', color: 'text-amber-600' },
  { label: 'Total recibido (GTQ)', value: '—', color: 'text-emerald-600' },
  { label: 'Equivalente (USD)', value: '—', color: 'text-indigo-600' },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const cards = user?.role === 'SENDER' ? SENDER_CARDS : RECEIVER_CARDS

  return (
    <div className="space-y-8">

      {/* Bienvenida */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Bienvenido, {user?.username}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Rol: <span className="font-medium">{user ? ROLE_LABEL[user.role] : '—'}</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
          <span className="text-brand-700 font-bold text-lg">
            {user?.username.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
          >
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder transacciones */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Últimas transacciones</h2>
        </div>
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-gray-400">No hay transacciones aún.</p>
        </div>
      </div>
    </div>
  )
}
