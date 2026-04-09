import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types'

const ROLE_LABEL: Record<UserRole, string> = {
  SENDER: 'Remitente',
  RECEIVER: 'Receptor',
}

const ROLE_BADGE: Record<UserRole, string> = {
  SENDER: 'bg-blue-100 text-blue-800',
  RECEIVER: 'bg-emerald-100 text-emerald-800',
}

export default function Navbar() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">DA</span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900">Don Alex</p>
            <p className="text-xs text-gray-400">Remesas</p>
          </div>
        </div>

        {/* Usuario */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-brand-700 text-xs font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[user.role]}`}
                >
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50"
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
