import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import api from '../api/axios'
import { useAuthStore } from '../store/authStore'
import type { Token, UserRead } from '../types'

interface FieldErrors {
  username?: string
  password?: string
}

/**
 * Página de login con validación Zero Trust en UI.
 *
 * Zero Trust en cliente:
 * - Los campos se validan ANTES de enviar la petición al backend.
 * - El token recibido nunca se loguea ni se expone en la URL.
 * - Los datos del usuario se obtienen de /users/me (fuente autoritativa),
 *   nunca se decodifica el JWT en el cliente.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // ── Validación client-side ──────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: FieldErrors = {}

    if (!username.trim()) {
      errors.username = 'El nombre de usuario es requerido'
    } else if (username.trim().length < 3) {
      errors.username = 'Mínimo 3 caracteres'
    }

    if (!password) {
      errors.password = 'La contraseña es requerida'
    } else if (password.length < 8) {
      errors.password = 'Mínimo 8 caracteres'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError(null)

    // Zero Trust: nunca llegar al backend con datos inválidos
    if (!validate()) return

    setIsLoading(true)
    try {
      // OAuth2PasswordRequestForm requiere application/x-www-form-urlencoded
      const formData = new URLSearchParams({
        username: username.trim(),
        password,
      })
      const { data: tokenData } = await api.post<Token>('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      // Zero Trust: obtenemos los datos del usuario desde el servidor,
      // nunca decodificando el JWT en el cliente.
      const { data: user } = await api.get<UserRead>('/users/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })

      setAuth(tokenData.access_token, user)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        if (status === 401) {
          setApiError('Usuario o contraseña incorrectos')
        } else if (status === 422) {
          setApiError('Datos de acceso inválidos')
        } else if (!err.response) {
          setApiError('No se pudo conectar con el servidor. Verifica tu conexión.')
        } else {
          setApiError('Error inesperado. Inténtalo de nuevo.')
        }
      } else {
        setApiError('Error inesperado. Inténtalo de nuevo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ── Limpiar error de campo al escribir ─────────────────────────────────────
  const clearFieldError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white text-2xl font-bold">DA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Don Alex</h1>
          <p className="text-gray-500 mt-1 text-sm">Sistema de Remesas Internacionales</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Iniciar sesión</h2>

          {/* Error de API */}
          {apiError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Usuario */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearFieldError('username') }}
                disabled={isLoading}
                placeholder="tu_usuario"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none
                  focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50
                  ${fieldErrors.username
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
              />
              {fieldErrors.username && (
                <p className="mt-1.5 text-xs text-red-600">{fieldErrors.username}</p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
                disabled={isLoading}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none
                  focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50
                  ${fieldErrors.password
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
              />
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400
                text-white text-sm font-semibold rounded-lg transition-colors
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Don Alex &copy; {new Date().getFullYear()} — Remesas seguras
        </p>
      </div>
    </div>
  )
}
