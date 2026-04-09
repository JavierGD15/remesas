import { useAuthStore } from '../store/authStore'
import SenderDashboard from './SenderDashboard'
import ReceiverDashboard from './ReceiverDashboard'

/**
 * Punto de entrada del dashboard autenticado.
 * Redirige al dashboard específico según el rol del usuario.
 */
export default function DashboardPage() {
  const role = useAuthStore((s) => s.user?.role)

  if (role === 'SENDER')   return <SenderDashboard />
  if (role === 'RECEIVER') return <ReceiverDashboard />

  return null
}
