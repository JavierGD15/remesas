// ── Auth ──────────────────────────────────────────────────────────────────────

export type UserRole = 'SENDER' | 'RECEIVER'

export interface UserRead {
  id: number
  username: string
  role: UserRole
}

export interface Token {
  access_token: string
  token_type: string
}

// ── Transactions ──────────────────────────────────────────────────────────────

export type TransactionType = 'SEND' | 'REQUEST'
export type TransactionStatus = 'PENDING' | 'COMPLETED'

export interface Transaction {
  id: number
  transaction_type: TransactionType
  sender_id: number
  receiver_id: number
  /** Decimal as string from the API */
  amount_usd: string | null
  amount_gtq: string | null
  exchange_rate: string | null
  status: TransactionStatus
  motive: string | null
  created_at: string
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}
