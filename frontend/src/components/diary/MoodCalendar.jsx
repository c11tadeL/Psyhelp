import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Palette, Check } from 'lucide-react'
import {
  buildCalendarGrid, monthLabel, todayISO, isFuture,
  WEEKDAYS_SHORT, toISODate,
} from './dateUtils'
import { CALENDAR_THEMES, getStoredTheme, setStoredTheme } from './calendarThemes'
import { SeasonIcon } from './SeasonIcon'
import { moodEmoji } from '../../utils/format'

function ThemePicker({ anchorRef, themeId, onPick, onClose }) {
  const [pos, setPos] = useState(null)

  useEffect(() => {
    const updatePos = () => {
      if (!anchorRef.current) return
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right - window.scrollX,
      })
    }
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [anchorRef])

  useEffect(() => {
    const onClick = (e) => {
      if (anchorRef.current?.contains(e.target)) return
      if (e.target.closest('[data-theme-picker]')) return
      onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [anchorRef, onClose])

  if (!pos) return null

  return createPortal(
    <div
      data-theme-picker
      style={{
        position: 'absolute',
        top: pos.top,
        right: pos.right,
        zIndex: 9999,
      }}
      className="bg-white rounded-xl shadow-gentle border border-cream-200 p-2 min-w-[220px] animate-fade-in"
    >
      <p className="text-xs font-semibold text-sage-500 px-3 py-1.5">Оформлення</p>
      {Object.values(CALENDAR_THEMES).map((t) => (
        <button
          key={t.id}
          onClick={() => onPick(t.id)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-cream-50 text-left transition-colors"
        >
          <span
            className={`w-9 h-9 rounded-lg bg-gradient-to-br ${t.preview} border border-cream-300 flex-shrink-0`}
          />
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-sm text-sage-800">{t.name}</span>
            <span className="block text-xs text-sage-500">{t.description}</span>
          </span>
          {themeId === t.id && <Check className="w-4 h-4 text-sage-500 flex-shrink-0" />}
        </button>
      ))}
    </div>,
    document.body
  )
}

export function MoodCalendar({ entries = [], onDayClick }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [themeId, setThemeId] = useState(getStoredTheme())
  const [showThemePicker, setShowThemePicker] = useState(false)
  const paletteButtonRef = useRef(null)

  const theme = CALENDAR_THEMES[themeId] || CALENDAR_THEMES.minimal

  const entryMap = useMemo(() => {
    const map = {}
    entries.forEach((e) => {
      const iso = typeof e.entry_date === 'string'
        ? e.entry_date.slice(0, 10)
        : toISODate(e.entry_date)
      map[iso] = e
    })
    return map
  }, [entries])

  const grid = useMemo(() => buildCalendarGrid(year, month), [year, month])

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }

  const next = () => {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }

  const goToday = () => {
    setMonth(today.getMonth())
    setYear(today.getFullYear())
  }

  const pickTheme = (id) => {
    setThemeId(id)
    setStoredTheme(id)
    setShowThemePicker(false)
  }

  const currentIso = todayISO()
  const { isDark } = theme

  return (
    <div
      className={`rounded-2xl shadow-soft p-5 sm:p-7 relative ${theme.container}`}
      style={theme.containerStyle}
    >
      {/* Заголовок з сезонною іконкою */}
      <div className={`flex items-center justify-between mb-5 ${theme.header}`}>
        <button onClick={prev} className={theme.navButton} aria-label="Попередній місяць">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <SeasonIcon month={month} color={theme.iconColor} />
          <h2 className={theme.monthName}>{monthLabel(year, month)}</h2>
          <button
            onClick={goToday}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
              isDark
                ? 'bg-white/20 hover:bg-white/30 text-cream-50'
                : 'bg-sage-100/80 hover:bg-sage-200 text-sage-700'
            }`}
          >
            Сьогодні
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            ref={paletteButtonRef}
            onClick={() => setShowThemePicker((v) => !v)}
            className={theme.navButton}
            aria-label="Змінити тему"
          >
            <Palette className="w-5 h-5" />
          </button>
          <button onClick={next} className={theme.navButton} aria-label="Наступний місяць">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Дні тижня */}
      <div className={`grid grid-cols-7 ${theme.weekdayRow}`}>
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} className={`text-center ${theme.weekday}`}>{w}</div>
        ))}
      </div>

      {/* Сітка днів */}
      <div className={`grid grid-cols-7 ${theme.gridGap}`}>
        {grid.map((cell, idx) => {
          const entry = entryMap[cell.iso]
          const isCurrentDay = cell.iso === currentIso
          const future = isFuture(cell.iso)
          const clickable = !future && cell.isCurrentMonth

          let cls = `aspect-square p-1.5 flex flex-col items-center justify-center transition-all ${theme.day}`
          if (!cell.isCurrentMonth) cls += ` ${theme.dayOtherMonth}`
          if (isCurrentDay) cls += ` ${theme.dayToday}`
          if (future) cls += ` ${theme.dayFuture}`
          if (clickable) cls += ' cursor-pointer hover:scale-105'

          return (
            <button
              key={idx}
              onClick={() => clickable && onDayClick?.(cell.iso)}
              disabled={!clickable}
              className={cls}
              aria-label={`${cell.day} число`}
            >
              <span className="text-sm font-semibold leading-none">{cell.day}</span>
              {entry && (
                <span className="text-xl mt-0.5 leading-none" title={`Настрій ${entry.mood}/10`}>
                  {moodEmoji[entry.mood]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Підказка */}
      <div className={`mt-5 pt-3 border-t ${isDark ? 'border-white/10' : 'border-cream-200'}`}>
        <p className={`text-xs text-center ${isDark ? 'text-cream-200' : 'text-sage-500'}`}>
          Натисніть на сьогоднішній день, щоб записати настрій. Минулі дні доступні лише для перегляду.
        </p>
      </div>

      {showThemePicker && (
        <ThemePicker
          anchorRef={paletteButtonRef}
          themeId={themeId}
          onPick={pickTheme}
          onClose={() => setShowThemePicker(false)}
        />
      )}
    </div>
  )
}
