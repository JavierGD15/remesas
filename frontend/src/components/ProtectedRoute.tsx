import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Guarda de rutas protegidas.
 * Si no hay token en el store, redirige a /login sin dejar rastro en el historial.
 * Renderiza <Outlet /> para las rutas anidadas cuando el usuario está autenticado.
 */
export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
