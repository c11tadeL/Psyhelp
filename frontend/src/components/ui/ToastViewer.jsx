import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useToastStore } from '../../hooks/useToast'

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const COLORS = {
  success: 'border-sage-300 bg-sage-50 text-sage-800',
  error: 'border-warm-300 bg-warm-50 text-warm-500',
  info: 'border-accent-200 bg-accent-50 text-accent-500',
}

export function ToastViewer() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-soft animate-slide-up min-w-[280px] max-w-md ${COLORS[t.type]}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
