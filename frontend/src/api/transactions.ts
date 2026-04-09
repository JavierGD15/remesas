import api from './axios'
import type { Page, Transaction } from '../types'

export interface SendPayload {
  receiver_id: number
  amount_usd: number
  motive?: string
}

export interface RequestPayload {
  sender_id: number
  amount_gtq: number
  motive: string
}

export const transactionsApi = {
  list: (params: { limit: number; offset: number }) =>
    api.get<Page<Transaction>>('/transactions', { params }),

  send: (data: SendPayload) =>
    api.post<Transaction>('/transactions/send', data),

  request: (data: RequestPayload) =>
    api.post<Transaction>('/transactions/request', data),

  confirm: (id: number) =>
    api.put<Transaction>(`/transactions/${id}/confirm`),
}
