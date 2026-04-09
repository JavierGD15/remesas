import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { transactionsApi } from '../../api/transactions'
import { useToastStore } from '../../store/toastStore'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

interface Fields {
  receiver_id: string
  amount_usd: string
  motive: string
}

interface FieldErrors {
  receiver_id?: string
  amount_usd?: string
}

export function SendForm({ onSuccess, onCancel }: Props) {
  const toast = useToastStore((s) => s.toast)
  const [fields, setFields] = useState<Fields>({ receiver_id: '', amount_usd: '', motive: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }))
    if (errors[key as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  const validate = (): boolean => {
    const errs: FieldErrors = {}
    const id = parseInt(fields.receiver_id)
    if (!fields.receiver_id || isNaN(id) || id <= 0) errs.receiver_id = 'ID de receptor inválido'
    const amt = parseFloat(fields.amount_usd)
    if (!fields.amount_usd || isNaN(amt) || amt <= 0) errs.amount_usd = 'Ingresa un monto mayor a 0'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      await transactionsApi.send({
        receiver_id: parseInt(fields.receiver_id),
        amount_usd: parseFloat(fields.amount_usd),
        motive: fields.motive.trim() || undefined,
      })
      toast('Envío registrado correctamente', 'success')
      onSuccess()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail as string | undefined
        toast(detail ?? 'Error al registrar el envío', 'error')
      } else {
        toast('Error inesperado', 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const inputBase =
    'w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none ' +
    'focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Receptor ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            ID del receptor
          </label>
          <input
            type="number"
            min="1"
            value={fields.receiver_id}
            onChange={set('receiver_id')}
            disabled={isLoading}
            placeholder="Ej: 2"
            className={`${inputBase} ${errors.receiver_id ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
          />
          {errors.receiver_id && <p className="mt-1 text-xs text-red-600">{errors.receiver_id}</p>}
        </div>

        {/* Monto USD */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Monto en USD
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={fields.amount_usd}
              onChange={set('amount_usd')}
              disabled={isLoading}
              placeholder="0.00"
              className={`${inputBase} pl-8 ${errors.amount_usd ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            />
          </div>
          {errors.amount_usd && <p className="mt-1 text-xs text-red-600">{errors.amount_usd}</p>}
        </div>
      </div>

      {/* Motivo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Motivo <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          maxLength={255}
          value={fields.motive}
          onChange={set('motive')}
          disabled={isLoading}
          placeholder="Ej: Ayuda mensual"
          className={`${inputBase} border-gray-300`}
        />
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300
            rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 text-sm font-semibold text-white bg-brand-600
            hover:bg-brand-700 disabled:bg-brand-400 rounded-lg transition-colors
            flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            'Registrar envío'
          )}
        </button>
      </div>
    </form>
  )
}
