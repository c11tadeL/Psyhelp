import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { BookHeart, Plus, Trash2 } from 'lucide-react'
import { diaryApi } from '../../api/endpoints'
import { Spinner, PageLoader, EmptyState, Modal, Confirm } from '../../components/ui/Common'
import { toast } from '../../hooks/useToast'
import {
  formatDate, formatDateShort, getApiError,
  moodEmoji, moodLabels, moodColor,
} from '../../utils/format'

const PERIODS = [
  { value: 7, label: 'Тиждень' },
  { value: 30, label: 'Місяць' },
  { value: 90, label: '3 місяці' },
]

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

function NewEntryModal({ open, onClose }) {
  const queryClient = useQueryClient()
  const [mood, setMood] = useState(5)
  const [note, setNote] = useState('')

  const upsert = useMutation({
    mutationFn: diaryApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] })
      toast.success('Запис збережено')
      onClose()
      setMood(5); setNote('')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Як ви сьогодні?">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          upsert.mutate({ mood, note: note || undefined })
        }}
        className="space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-sage-700 mb-3">
            Оцініть свій настрій
          </label>
          <MoodScale value={mood} onChange={setMood} />
          <p className="text-center text-sage-600 mt-3 font-medium">
            {moodEmoji[mood]} {moodLabels[mood]}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1.5">
            Що відчуваєте? (опціонально)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder="Тригери, думки, події дня..."
            className="textarea"
          />
          <p className="text-xs text-sage-400 mt-1">
            🔒 Ваші записи зашифровані. Навіть модератор їх не бачить.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Скасувати
          </button>
          <button type="submit" disabled={upsert.isPending} className="btn-primary">
            {upsert.isPending ? <Spinner /> : 'Зберегти'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function DiaryPage() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState(30)
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fromDate = new Date(Date.now() - period * 86400_000).toISOString().slice(0, 10)
  const toDate = new Date().toISOString().slice(0, 10)

  const { data: entries, isLoading } = useQuery({
    queryKey: ['diary', { period }],
    queryFn: () => diaryApi.list({ from: fromDate, to: toDate, limit: 365 }),
  })

  const { data: analytics } = useQuery({
    queryKey: ['diary', 'analytics', { period }],
    queryFn: () => diaryApi.analytics({ from: fromDate, to: toDate }),
  })

  const remove = useMutation({
    mutationFn: diaryApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] })
      toast.success('Запис видалено')
    },
  })

  const chartData = (entries?.items || [])
    .slice()
    .reverse()
    .map((e) => ({
      date: formatDateShort(e.entry_date),
      mood: e.mood,
    }))

  return (
    <div className="container-app py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-sage-900 mb-2">
            Емоційний щоденник
          </h1>
          <p className="text-sage-600">
            Відстежуйте свій психоемоційний стан та виявляйте тенденції
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary self-start">
          <Plus className="w-4 h-4" /> Новий запис
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-sage-500 text-white'
                : 'bg-white border border-cream-300 text-sage-600 hover:bg-cream-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {analytics?.stats?.total_entries > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card-flat">
            <p className="text-xs text-sage-500 mb-1">Записів</p>
            <p className="text-2xl font-display font-bold text-sage-800">
              {analytics.stats.total_entries}
            </p>
          </div>
          <div className="card-flat">
            <p className="text-xs text-sage-500 mb-1">Середній настрій</p>
            <p className={`text-2xl font-display font-bold ${moodColor(Math.round(analytics.stats.avg_mood))}`}>
              {analytics.stats.avg_mood}
            </p>
          </div>
          <div className="card-flat">
            <p className="text-xs text-sage-500 mb-1">Найгірший день</p>
            <p className={`text-2xl font-display font-bold ${moodColor(analytics.stats.min_mood)}`}>
              {moodEmoji[analytics.stats.min_mood]} {analytics.stats.min_mood}
            </p>
          </div>
          <div className="card-flat">
            <p className="text-xs text-sage-500 mb-1">Найкращий день</p>
            <p className={`text-2xl font-display font-bold ${moodColor(analytics.stats.max_mood)}`}>
              {moodEmoji[analytics.stats.max_mood]} {analytics.stats.max_mood}
            </p>
          </div>
        </div>
      )}

      {chartData.length >= 2 && (
        <div className="card mb-6">
          <h3 className="font-display font-semibold text-sage-800 mb-4">Динаміка настрою</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3ebe5" />
              <XAxis dataKey="date" stroke="#7c9d87" fontSize={12} />
              <YAxis domain={[1, 10]} stroke="#7c9d87" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fdfbf7',
                  border: '1px solid #c7d8cc',
                  borderRadius: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#5d8169"
                strokeWidth={3}
                dot={{ fill: '#5d8169', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <h2 className="font-display font-semibold text-xl text-sage-800 mb-3">Записи</h2>

      {isLoading ? (
        <PageLoader />
      ) : entries?.items?.length === 0 ? (
        <EmptyState
          icon={BookHeart}
          title="Поки немає записів"
          description="Перший запис допоможе почати відстежувати ваш стан"
          action={
            <button onClick={() => setOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Перший запис
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {entries?.items?.map((e) => (
            <div key={e.id} className="card-flat">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{moodEmoji[e.mood]}</span>
                  <div>
                    <p className={`font-display font-bold text-lg ${moodColor(e.mood)}`}>
                      {e.mood}/10 — {moodLabels[e.mood]}
                    </p>
                    <p className="text-xs text-sage-400">{formatDate(e.entry_date)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmDelete(e.id)}
                  className="text-sage-300 hover:text-warm-400 p-1"
                  title="Видалити запис"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {e.note && (
                <p className="text-sage-700 whitespace-pre-wrap mt-2 leading-relaxed">
                  {e.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <NewEntryModal open={open} onClose={() => setOpen(false)} />

      <Confirm
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove.mutate(confirmDelete)}
        title="Видалити запис?"
        message="Цю дію неможливо скасувати."
        danger
      />
    </div>
  )
}
