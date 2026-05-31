import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Sparkles } from 'lucide-react'
import { diaryApi } from '../../api/endpoints'
import { PageLoader } from '../../components/ui/Common'
import { MoodCalendar } from '../../components/diary/MoodCalendar'
import { DayEntryModal } from '../../components/diary/DayEntryModal'
import { MoodOverview } from '../../components/diary/MoodOverview'

const TABS = [
  { id: 'calendar', label: 'Календар', icon: CalendarDays },
  { id: 'overview', label: 'Огляд настрою', icon: Sparkles },
]

export function DiaryPage() {
  const [tab, setTab] = useState('calendar')
  const [selectedDay, setSelectedDay] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['diary', 'all'],
    queryFn: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 400)
      const toIso = to.toISOString().slice(0, 10)
      const fromIso = from.toISOString().slice(0, 10)
      return diaryApi.list({ from: fromIso, to: toIso, limit: 365 })
    },
    staleTime: 30_000,
  })

  const entries = data?.items || []

  const selectedEntry = useMemo(() => {
    if (!selectedDay) return null
    return entries.find((e) => e.entry_date.slice(0, 10) === selectedDay) || null
  }, [selectedDay, entries])

  return (
    <div className="container-app py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-sage-900 mb-2">
          Емоційний щоденник
        </h1>
        <p className="text-sage-600">
          Відстежуйте свої почуття щодня та помічайте власні тенденції
        </p>
      </div>

      {/* Таби */}
      <div className="flex gap-2 mb-6 border-b border-cream-200">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 font-medium transition-colors ${
                active
                  ? 'border-sage-500 text-sage-800'
                  : 'border-transparent text-sage-500 hover:text-sage-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Контент */}
      <div className="animate-fade-in">
        {isLoading ? (
          <PageLoader />
        ) : tab === 'calendar' ? (
          <MoodCalendar
            entries={entries}
            onDayClick={(iso) => setSelectedDay(iso)}
          />
        ) : (
          <MoodOverview entries={entries} />
        )}
      </div>

      <DayEntryModal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        iso={selectedDay}
        entry={selectedEntry}
      />
    </div>
  )
}
