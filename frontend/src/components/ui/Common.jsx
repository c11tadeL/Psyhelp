import { Loader2, X } from 'lucide-react'
import { useEffect } from 'react'

export function Spinner({ className = 'w-5 h-5' }) {
  return <Loader2 className={`${className} animate-spin text-sage-500`} />
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner className="w-10 h-10" />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      {Icon && (
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sage-50 flex items-center justify-center">
          <Icon className="w-8 h-8 text-sage-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-sage-800 mb-1">{title}</h3>
      {description && (
        <p className="text-sage-500 mb-4 max-w-md mx-auto">{description}</p>
      )}
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onEsc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sage-900/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`${sizes[size]} w-full bg-white rounded-2xl shadow-gentle p-6 animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold text-sage-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-sage-400 hover:text-sage-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Confirm({ open, onClose, onConfirm, title, message, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sage-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-ghost">
          Скасувати
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className={danger ? 'btn-danger' : 'btn-primary'}
        >
          Підтвердити
        </button>
      </div>
    </Modal>
  )
}
