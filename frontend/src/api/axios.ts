/**
 * Instancia centralizada de Axios.
 *
 * Interceptor de request: inyecta el Bearer token en cada petición
 * si existe en el store (Zero Trust: nunca se hardcodea ni se lee de la URL).
 *
 * Interceptor de response: ante un 401, limpia el estado de auth y redirige
 * a /login para forzar re-autenticación (sesión expirada o token inválido).
 */
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// ── Request: inyectar Authorization ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  // useAuthStore.getState() funciona fuera de componentes React con Zustand
  const { token } = useAuthStore.getState()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response: manejar sesión expirada ─────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      // window.location.replace evita que /login quede en el historial
      window.location.replace('/login')
    }
    return Promise.reject(error)
  },
)

export default api
