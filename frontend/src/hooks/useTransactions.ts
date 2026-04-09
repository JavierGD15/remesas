import { useCallback, useEffect, useState } from 'react'
import { transactionsApi } from '../api/transactions'
import { useToastStore } from '../store/toastStore'
import type { Page, Transaction } from '../types'

/**
 * Hook reutilizable para cargar transacciones con paginación.
 * Muestra toast de error automáticamente. Devuelve `error` para UI inline.
 */
export function useTransactions(limit: number, offset: number) {
  const toast = useToastStore((s) => s.toast)
  const [data, setData] = useState<Page<Transaction> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: page } = await transactionsApi.list({ limit, offset })
      setData(page)
    } catch {
      const msg = 'Error al cargar las transacciones'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [limit, offset, toast])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, isLoading, error, refetch: fetch }
}
