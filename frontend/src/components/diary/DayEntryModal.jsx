import { useEffect, useState } from 'react'
import { Lock, Trash2 } from 'lucide-react'
import { Modal, Spinner, Confirm } from '../ui/Common'
import { moodEmoji, moodLabels, moodColor, getApiError } from '../../utils/format'
import { fullDateLabel, isToday } from './dateUtils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { diaryApi } from '../../api/endpoints'
import { toast } from '../../hooks/useToast'

function MoodScale({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`aspect-square rounded-xl text-2xl flex flex-col items-center justify-center transition-all ${
            value === v
              ? 'bg-sage-500 text-white scale-105 shadow-soft'
              : 'bg-cream-100 hover:bg-cream-200'
          }`}
          title={moodLabels[v]}
        >
          <span>{moodEmoji[v]}</span>
          <span className={`text-[10px] font-semibold ${value === v ? 'text-white' : 'text-sage-500'}`}>
            {v}
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * Модалка для конкретного дня щоденника.
 * Поведінка:
 *   • Сьогодні → форма редагування (створити / змінити)
 *   • Минулий день → перегляд тільки (з повідомленням про блокування)
 */
export function DayEntryModal({ open, onClose, iso, entry }) {
  const queryClient = useQueryClient()
  const [mood, setMood] = useState(entry?.mood || 5)
  const [note, setNote] = useState(entry?.note || '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const editable = iso && isToday(iso)

  useEffect(() => {
    if (open) {
      setMood(entry?.mood || 5)
      setNote(entry?.note || '')
    }
  }, [open, entry])

  const upsert = useMutation({
    mutationFn: diaryApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] })
      toast.success(entry ? 'Запис оновлено' : 'Запис збережено')
      onClose()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const remove = useMutation({
    mutationFn: diaryApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] })
      toast.success('Запис видалено')
      onClose()
    },
  })

  if (!iso) return null

  return (
    <Modal open={open} onClose={onClose} title={fullDateLabel(iso)}>
      {/* Минулий день — тільки перегляд */}
      {!editable && (
        <div>
          {entry ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-cream-50">
                <span className="text-5xl">{moodEmoji[entry.mood]}</span>
                <div>
                  <p className={`font-display font-bold text-2xl ${moodColor(entry.mood)}`}>
                    {entry.mood}/10
                  </p>
                  <p className="text-sage-600">{moodLabels[entry.mood]}</p>
                </div>
              </div>

              {entry.note && (
                <div>
                  <p className="text-xs font-semibold text-sage-500 mb-2">НОТАТКА</p>
                  <p className="text-sage-700 whitespace-pre-wrap leading-relaxed bg-cream-50 rounded-xl p-4">
                    {entry.note}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-sage-400 pt-3 border-t border-cream-100">
                <Lock className="w-3.5 h-3.5" />
                Записи минулих днів можна лише переглядати
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sage-500 mb-2">У цей день немає запису</p>
              <p className="text-xs text-sage-400">
                Записи можна додавати лише у поточний день
              </p>
            </div>
          )}
        </div>
      )}

      {/* Сьогодні — форма редагування */}
      {editable && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            upsert.mutate({ mood, note: note || undefined, entry_date: iso })
          }}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-3">
              Як ви себе почуваєте?
            </label>
            <MoodScale value={mood} onChange={setMood} />
            <p className="text-center text-sage-600 mt-3 font-medium">
              {moodEmoji[mood]} {moodLabels[mood]}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-sage-700 mb-1.5">
              Що відчуваєте? <span className="text-sage-400 font-normal">(опціонально)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="Тригери, думки, події дня..."
              className="textarea"
            />
            <p className="text-xs text-sage-400 mt-1">
              🔒 Записи зашифровані. Навіть модератор їх не бачить.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-cream-100">
            {entry ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-sage-400 hover:text-warm-400 text-sm flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Видалити
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost">
                Скасувати
              </button>
              <button type="submit" disabled={upsert.isPending} className="btn-primary">
                {upsert.isPending ? <Spinner /> : 'Зберегти'}
              </button>
            </div>
          </div>
        </form>
      )}

      {entry && (
        <Confirm
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => remove.mutate(entry.id)}
          title="Видалити запис?"
          message="Запис за цей день буде назавжди видалено."
          danger
        />
      )}
    </Modal>
  )
}
