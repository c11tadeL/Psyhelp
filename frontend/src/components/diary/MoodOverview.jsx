import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from 'recharts'
import {
  TrendingUp, Calendar as CalendarIcon, Smile, Frown, BarChart3, Sparkles,
  Lightbulb, Brain,
} from 'lucide-react'
import { moodEmoji, moodLabels, moodColor } from '../../utils/format'
import { daysAgo, fullDateLabel, fromISODate, MONTHS_GENITIVE } from './dateUtils'

const PERIODS = [
  { value: 7, label: 'Тиждень' },
  { value: 30, label: 'Місяць' },
  { value: 90, label: '3 місяці' },
  { value: 180, label: 'Пів року' },
  { value: 365, label: 'Рік' },
]

const WEEKDAY_NAMES = ['неділю', 'понеділок', 'вівторок', 'середу', 'четвер', 'п\'ятницю', 'суботу']
const WEEKDAY_NAMES_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-soft">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg bg-${accent || 'sage'}-100 text-${accent || 'sage'}-600`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs text-sage-500 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-display font-bold text-sage-900">{value}</p>
      {sub && <p className="text-xs text-sage-500 mt-1">{sub}</p>}
    </div>
  )
}

function HighlightCard({ title, icon: Icon, entry, color }) {
  if (!entry) {
    return (
      <div className={`rounded-2xl p-5 ${color}`}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" />
          <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
        </div>
        <p className="text-sage-500 text-sm">Поки немає даних</p>
      </div>
    )
  }
  return (
    <div className={`rounded-2xl p-5 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      <div className="flex items-start gap-3">
        <span className="text-4xl">{moodEmoji[entry.mood]}</span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-2xl leading-none">{entry.mood}/10</p>
          <p className="text-sm mt-0.5 opacity-80">{moodLabels[entry.mood]}</p>
          <p className="text-xs mt-2 opacity-70">{fullDateLabel(entry.entry_date.slice(0, 10))}</p>
          {entry.note && (
            <p className="text-sm mt-2 italic line-clamp-2 opacity-90">«{entry.note}»</p>
          )}
        </div>
      </div>
    </div>
  )
}

function generateInsights(sortedEntries, allEntries, period) {
  const insights = []
  if (sortedEntries.length < 3) return insights

  const moods = sortedEntries.map((e) => e.mood)
  const avg = moods.reduce((a, b) => a + b, 0) / moods.length

  // Порівняння з попереднім аналогічним періодом
  if (allEntries.length > 0 && period <= 90) {
    const prevFrom = daysAgo(period * 2)
    const prevTo = daysAgo(period)
    const prevEntries = allEntries.filter((e) => {
      const iso = e.entry_date.slice(0, 10)
      return iso >= prevFrom && iso < prevTo
    })
    if (prevEntries.length >= 3) {
      const prevAvg = prevEntries.reduce((a, b) => a + b.mood, 0) / prevEntries.length
      const diff = avg - prevAvg
      if (Math.abs(diff) >= 0.5) {
        const periodLabel = period === 7 ? 'тиждень' : period === 30 ? 'місяць' : '3 місяці'
        if (diff > 0) {
          insights.push({
            type: 'positive',
            text: `Цей ${periodLabel} був на ${diff.toFixed(1)} бали кращим ніж попередній — помітний прогрес!`,
          })
        } else {
          insights.push({
            type: 'neutral',
            text: `Цей ${periodLabel} був трохи складнішим ніж попередній (−${Math.abs(diff).toFixed(1)} бали). Це нормально.`,
          })
        }
      }
    }
  }

  // Тренд: перша половина vs друга половина періоду
  if (sortedEntries.length >= 6) {
    const half = Math.floor(sortedEntries.length / 2)
    const firstHalf = sortedEntries.slice(0, half).map((e) => e.mood)
    const secondHalf = sortedEntries.slice(half).map((e) => e.mood)
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    const diff = secondAvg - firstAvg
    if (diff >= 1) {
      insights.push({
        type: 'positive',
        text: 'Ваш настрій покращується з часом — остання частина періоду значно краща за початок.',
      })
    } else if (diff <= -1) {
      insights.push({
        type: 'neutral',
        text: 'Останнім часом настрій трохи знизився порівняно з початком періоду.',
      })
    }
  }

  // Патерн по днях тижня
  if (sortedEntries.length >= 7) {
    const byWeekday = Array.from({ length: 7 }, () => [])
    sortedEntries.forEach((e) => {
      const d = fromISODate(e.entry_date.slice(0, 10))
      byWeekday[d.getDay()].push(e.mood)
    })
    const weekdayAvgs = byWeekday.map((arr) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null
    )
    const validAvgs = weekdayAvgs.map((v, i) => ({ avg: v, day: i })).filter((x) => x.avg !== null)
    if (validAvgs.length >= 4) {
      const best = validAvgs.reduce((a, b) => (a.avg > b.avg ? a : b))
      const worst = validAvgs.reduce((a, b) => (a.avg < b.avg ? a : b))
      if (best.avg - worst.avg >= 1.5) {
        insights.push({
          type: 'pattern',
          text: `Ваш настрій зазвичай найкращий у ${WEEKDAY_NAMES[best.day]} (${best.avg.toFixed(1)}/10) і найнижчий у ${WEEKDAY_NAMES[worst.day]} (${worst.avg.toFixed(1)}/10).`,
          weekdayAvgs,
          bestDay: best.day,
          worstDay: worst.day,
        })
      }
    }
  }

  // Стабільність настрою (стандартне відхилення)
  if (moods.length >= 5) {
    const variance = moods.reduce((acc, m) => acc + Math.pow(m - avg, 2), 0) / moods.length
    const std = Math.sqrt(variance)
    if (std < 1.2) {
      insights.push({
        type: 'positive',
        text: 'Ваш настрій дуже стабільний — коливання мінімальні. Це ознака внутрішньої рівноваги.',
      })
    } else if (std > 2.5) {
      insights.push({
        type: 'neutral',
        text: 'Настрій суттєво коливається — є дні злетів і падінь. Зверніть увагу на тригери.',
      })
    }
  }

  return insights
}

function InsightsBlock({ insights }) {
  if (insights.length === 0) return null

  const colors = {
    positive: 'bg-sage-50 border-sage-200 text-sage-800',
    neutral: 'bg-cream-50 border-cream-300 text-sage-700',
    pattern: 'bg-accent-50 border-accent-200 text-sage-800',
  }

  const patternInsight = insights.find((i) => i.type === 'pattern')

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Brain className="w-4 h-4 text-sage-500" />
        <h3 className="font-display font-semibold text-sage-800">Інсайти</h3>
      </div>

      {insights.map((insight, i) => (
        <div
          key={i}
          className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${colors[insight.type]}`}
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-60" />
            <p>{insight.text}</p>
          </div>
        </div>
      ))}

      {/* Мінівізуалізація по днях тижня якщо є патерн */}
      {patternInsight?.weekdayAvgs && (
        <div className="pt-2">
          <p className="text-xs text-sage-500 mb-2 font-medium">Середній настрій по днях тижня</p>
          <div className="flex gap-1">
            {patternInsight.weekdayAvgs.map((avg, day) => {
              if (avg === null) return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full h-8 rounded bg-cream-100" />
                  <span className="text-[10px] text-sage-400">{WEEKDAY_NAMES_SHORT[day]}</span>
                </div>
              )
              const isBest = day === patternInsight.bestDay
              const isWorst = day === patternInsight.worstDay
              const height = Math.round((avg / 10) * 40) + 8
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: 48 }}>
                    <div
                      className={`w-full rounded-t transition-all ${
                        isBest ? 'bg-sage-400' : isWorst ? 'bg-warm-300' : 'bg-sage-200'
                      }`}
                      style={{ height }}
                      title={`${avg.toFixed(1)}/10`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isBest ? 'text-sage-600' : isWorst ? 'text-warm-500' : 'text-sage-400'}`}>
                    {WEEKDAY_NAMES_SHORT[day]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function MoodOverview({ entries = [] }) {
  const [period, setPeriod] = useState(30)

  const data = useMemo(() => {
    const fromDate = daysAgo(period)
    const filtered = entries.filter((e) => {
      const iso = e.entry_date.slice(0, 10)
      return iso >= fromDate
    })

    if (filtered.length === 0) {
      return { entries: [], stats: null, insights: [] }
    }

    const sorted = [...filtered].sort((a, b) =>
      a.entry_date.localeCompare(b.entry_date)
    )

    const moods = sorted.map((e) => e.mood)
    const sum = moods.reduce((a, b) => a + b, 0)
    const avg = sum / moods.length

    const bestEntry = sorted.reduce((max, e) => (e.mood > max.mood ? e : max), sorted[0])
    const worstEntry = sorted.reduce((min, e) => (e.mood < min.mood ? e : min), sorted[0])

    // Розподіл за рівнями настрою (1-10)
    const distribution = Array.from({ length: 10 }, (_, i) => ({
      mood: i + 1,
      count: moods.filter((m) => m === i + 1).length,
    }))

    // Динаміка для графіка
    const chartData = sorted.map((e) => {
      const d = fromISODate(e.entry_date.slice(0, 10))
      return {
        date: `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()].slice(0, 3)}`,
        mood: e.mood,
      }
    })

    const insights = generateInsights(sorted, entries, period)

    return {
      entries: sorted,
      chartData,
      distribution,
      insights,
      stats: {
        count: filtered.length,
        avg: avg.toFixed(1),
        best: bestEntry,
        worst: worstEntry,
      },
    }
  }, [entries, period])

  return (
    <div className="space-y-5">
      {/* Заголовок + перемикач періоду */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-sage-500" />
          <h2 className="font-display font-bold text-xl text-sage-900">
            Огляд настрою
          </h2>
        </div>
        <p className="text-sage-500 text-sm mb-4">
          Виявіть тенденції, побачте найсвітліші та найскладніші дні
        </p>

        <div className="flex gap-2 flex-wrap">
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
      </div>

      {!data.stats && (
        <div className="card-flat text-center py-12">
          <p className="text-sage-500">За цей період ще немає записів</p>
          <p className="text-xs text-sage-400 mt-1">
            Додавайте записи щодня, щоб відстежувати свій стан
          </p>
        </div>
      )}

      {data.stats && (
        <>
          {/* Швидка статистика */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={CalendarIcon}
              label="Записів"
              value={data.stats.count}
              sub={`за ${period} днів`}
            />
            <StatCard
              icon={TrendingUp}
              label="Середній настрій"
              value={
                <span className={moodColor(Math.round(data.stats.avg))}>
                  {moodEmoji[Math.round(data.stats.avg)]} {data.stats.avg}
                </span>
              }
              sub={moodLabels[Math.round(data.stats.avg)]}
            />
          </div>

          {/* Інсайти */}
          {data.insights.length > 0 && (
            <InsightsBlock insights={data.insights} />
          )}

          {/* Найвищий і найнижчий настрій */}
          <div className="grid sm:grid-cols-2 gap-4">
            <HighlightCard
              title="Найвищий настрій"
              icon={Smile}
              entry={data.stats.best}
              color="bg-gradient-to-br from-sage-100 to-sage-200 text-sage-800"
            />
            <HighlightCard
              title="Найнижчий настрій"
              icon={Frown}
              entry={data.stats.worst}
              color="bg-gradient-to-br from-warm-100 to-warm-200 text-warm-500"
            />
          </div>

          {/* Графік динаміки */}
          {data.chartData.length >= 2 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-sage-500" />
                <h3 className="font-display font-semibold text-sage-800">
                  Динаміка настрою
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3ebe5" />
                  <XAxis dataKey="date" stroke="#7c9d87" fontSize={11} />
                  <YAxis domain={[1, 10]} stroke="#7c9d87" fontSize={11} ticks={[1, 3, 5, 7, 10]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fdfbf7',
                      border: '1px solid #c7d8cc',
                      borderRadius: 12,
                      fontFamily: 'Inter',
                    }}
                    formatter={(v) => [`${v}/10`, 'Настрій']}
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

          {/* Розподіл настроїв */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-sage-500" />
              <h3 className="font-display font-semibold text-sage-800">
                Розподіл за рівнями
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.distribution} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3ebe5" vertical={false} />
                <XAxis
                  dataKey="mood"
                  stroke="#7c9d87"
                  fontSize={11}
                  tickFormatter={(v) => `${moodEmoji[v]}`}
                />
                <YAxis stroke="#7c9d87" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fdfbf7',
                    border: '1px solid #c7d8cc',
                    borderRadius: 12,
                  }}
                  formatter={(v) => [`${v}`, 'Днів']}
                  labelFormatter={(v) => `${moodEmoji[v]} ${moodLabels[v]} (${v}/10)`}
                />
                <Bar dataKey="count" fill="#7c9d87" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}