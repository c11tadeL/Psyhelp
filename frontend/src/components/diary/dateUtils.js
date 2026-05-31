/**
 * dateUtils.js — утиліти для роботи з датами календаря.
 * Усе у форматі YYYY-MM-DD у локальному часі (без зсуву UTC).
 */

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

export const MONTHS_GENITIVE = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
]

export const MONTHS_NOMINATIVE = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
]

/** Сьогоднішня дата у форматі YYYY-MM-DD (локальний час). */
export function todayISO() {
  return toISODate(new Date())
}

/** Конвертує Date у YYYY-MM-DD без зсуву UTC. */
export function toISODate(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Парсить YYYY-MM-DD у Date (локальний час, північ). */
export function fromISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Скільки днів у місяці. */
export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Повертає масив 42 елементів (6 рядків × 7 днів) для відображення місяця.
 * Кожен елемент: { date: Date, iso: string, day: number, isCurrentMonth: bool }.
 * Тиждень починається з понеділка.
 */
export function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7 // понеділок = 0
  const daysCount = daysInMonth(year, month)

  const cells = []

  // Дні попереднього місяця
  const prevMonthDays = daysInMonth(year, month - 1)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i)
    cells.push({
      date: d,
      iso: toISODate(d),
      day: d.getDate(),
      isCurrentMonth: false,
    })
  }

  // Дні поточного місяця
  for (let i = 1; i <= daysCount; i++) {
    const d = new Date(year, month, i)
    cells.push({
      date: d,
      iso: toISODate(d),
      day: i,
      isCurrentMonth: true,
    })
  }

  // Дні наступного місяця (доповнюємо до 42)
  let nextDay = 1
  while (cells.length < 42) {
    const d = new Date(year, month + 1, nextDay++)
    cells.push({
      date: d,
      iso: toISODate(d),
      day: d.getDate(),
      isCurrentMonth: false,
    })
  }

  return cells
}

/** Перевірка: чи це сьогодні? */
export function isToday(iso) {
  return iso === todayISO()
}

/** Перевірка: чи це у майбутньому? */
export function isFuture(iso) {
  return iso > todayISO()
}

/** Перевірка: чи це у минулому (не сьогодні)? */
export function isPast(iso) {
  return iso < todayISO()
}

/** Назва місяця у називному відмінку: "Січень 2026". */
export function monthLabel(year, month) {
  return `${MONTHS_NOMINATIVE[month]} ${year}`
}

/** Повний підпис дня: "15 січня 2026". */
export function fullDateLabel(iso) {
  const d = fromISODate(iso)
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`
}

/** Дата N днів тому у форматі YYYY-MM-DD. */
export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISODate(d)
}
