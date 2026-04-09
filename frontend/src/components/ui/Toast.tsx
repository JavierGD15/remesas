import { useToastStore } from '../../store/toastStore'
import type { Toast, ToastType } from '../../store/toastStore'

const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-600',
  error:   'bg-red-600',
  info:    'bg-brand-600',
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm
        min-w-[280px] max-w-sm ${STYLES[toast.type]}`}
    >
      <span className="font-bold text-base leading-none mt-0.5">{ICONS[toast.type]}</span>
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => dismiss(toast.id)}
        className="ml-1 opacity-70 hover:opacity-100 transition-opacity text-base leading-none"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  )
}

/** Renderiza en la esquina superior derecha. Montar en AppLayout. */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (!toasts.length) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
