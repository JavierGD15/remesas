/**
 * Estado de autenticación global — Zustand con persistencia en localStorage.
 *
 * Trade-off de seguridad: localStorage es vulnerable a XSS, pero es el
 * estándar de facto en SPAs sin BFF. Mitigación: la superficie XSS se
 * reduce al mínimo (sin dangerouslySetInnerHTML, sin eval, CSP estricta).
 *
 * El token nunca se expone en logs ni en la URL (Zero Trust en cliente).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRead } from '../types'

interface AuthState {
  token: string | null
  user: UserRead | null
  setAuth: (token: string, user: UserRead) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: 'don-alex-auth',
      // Solo persiste token y user, no las funciones
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
)
