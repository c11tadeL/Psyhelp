import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Modal } from '../ui/Common'
import { complaintsApi } from '../../api/endpoints'
import { toast } from '../../hooks/useToast'
import { getApiError } from '../../utils/format'
import { Spinner } from '../ui/Common'

const REASONS = [
  { value: 'offensive', label: 'Образливий контент' },
  { value: 'spam', label: 'Спам або реклама' },
  { value: 'threat', label: 'Загрозливий вміст' },
  { value: 'self_harm', label: 'Заклики до самоушкодження' },
  { value: 'misinformation', label: 'Дезінформація' },
  { value: 'other', label: 'Інше' },
]

export function ReportModal({ open, onClose, contentType, contentId }) {
  const [reason, setReason] = useState('offensive')
  const [comment, setComment] = useState('')

  const mutation = useMutation({
    mutationFn: complaintsApi.create,
    onSuccess: () => {
      toast.success('Скаргу надіслано модератору')
      onClose()
      setReason('offensive')
      setComment('')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Поскаржитись на контент">
      <div className="space-y-4">
        <p className="text-sm text-sage-500">
          Опишіть причину скарги — модератор перегляне її якнайшвидше.
        </p>

        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1.5">
            Причина
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1.5">
            Уточнення (опційно)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="textarea"
            maxLength={500}
            placeholder="Деталі порушення..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">
            Скасувати
          </button>
          <button
            onClick={() =>
              mutation.mutate({
                content_type: contentType,
                content_id: contentId,
                reason,
                comment: comment || undefined,
              })
            }
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? <Spinner /> : 'Надіслати скаргу'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
