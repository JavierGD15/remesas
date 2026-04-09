/**
 * Formulario para RECEIVER — diseñado con accesibilidad para adultos mayores:
 * texto grande, campos amplios, alto contraste.
 */
import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { transactionsApi } from '../../api/transactions'
import { useToastStore } from '../../store/toastStore'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

interface Fields {
  sender_id: string
  amount_gtq: string
  motive: string
}

interface FieldErrors {
  sender_id?: string
  amount_gtq?: string
  motive?: string
}

export function RequestForm({ onSuccess, onCancel }: Props) {
  const toast = useToastStore((s) => s.toast)
  const [fields, setFields] = useState<Fields>({ sender_id: '', amount_gtq: '', motive: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }))
    if (errors[key as keyof FieldErrors]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = (): boolean => {
    const errs: FieldErrors = {}
    const id = parseInt(fields.sender_id)
    if (!fields.sender_id || isNaN(id) || id <= 0) errs.sender_id = 'ID del remitente inválido'
    const amt = parseFloat(fields.amount_gtq)
    if (!fields.amount_gtq || isNaN(amt) || amt <= 0) errs.amount_gtq = 'Ingresa un monto mayor a 0'
    if (!fields.motive.trim()) errs.motive = 'El motivo es requerido'
    else if (fields.motive.trim().length > 255) errs.motive = 'Máximo 255 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      await transactionsApi.request({
        sender_id: parseInt(fields.sender_id),
        amount_gtq: parseFloat(fields.amount_gtq),
        motive: fields.motive.trim(),
      })
      toast('¡Solicitud enviada correctamente!', 'success')
      onSuccess()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail as string | undefined
        toast(detail ?? 'Error al enviar la solicitud', 'error')
      } else {
        toast('Error inesperado', 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Clases accesibles: texto e inputs grandes
  const label = 'block text-lg font-semibold text-gray-800 mb-2'
  const input = (hasError: boolean) =>
    `w-full px-5 py-4 rounded-xl border-2 text-lg transition-colors outline-none ` +
    `focus:ring-2 focus:ring-emerald-400 focus:border-transparent disabled:opacity-50 ` +
    (hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white')

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">

      {/* Remitente */}
      <div>
        <label className={label}>ID del remitente (su hijo)</label>
        <input
          type="number"
          min="1"
          value={fields.sender_id}
          onChange={set('sender_id')}
          disabled={isLoading}
          placeholder="Ej: 1"
          className={input(!!errors.sender_id)}
        />
        {errors.sender_id && <p className="mt-2 text-base text-red-600">{errors.sender_id}</p>}
      </div>

      {/* Monto GTQ */}
      <div>
        <label className={label}>Cantidad que necesita en Quetzales (Q)</label>
        <div className="relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 text-xl font-bold">Q</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={fields.amount_gtq}
            onChange={set('amount_gtq')}
            disabled={isLoading}
            placeholder="0.00"
            className={`${input(!!errors.amount_gtq)} pl-12`}
          />
        </div>
        {errors.amount_gtq && <p className="mt-2 text-base text-red-600">{errors.amount_gtq}</p>}
      </div>

      {/* Motivo */}
      <div>
        <label className={label}>¿Para qué necesita el dinero?</label>
        <textarea
          rows={3}
          maxLength={255}
          value={fields.motive}
          onChange={set('motive')}
          disabled={isLoading}
          placeholder="Ej: Medicamentos, alquiler..."
          className={`${input(!!errors.motive)} resize-none`}
        />
        <div className="flex justify-between mt-1">
          {errors.motive
            ? <p className="text-base text-red-600">{errors.motive}</p>
            : <span />}
          <span className="text-sm text-gray-400">{fields.motive.length}/255</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-4 text-lg font-bold text-white bg-emerald-600
            hover:bg-emerald-700 disabled:bg-emerald-400 rounded-xl transition-colors
            flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            '📤 Enviar Solicitud'
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-4 text-lg font-semibold text-gray-700 border-2 border-gray-300
            rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
