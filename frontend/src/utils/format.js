const RTF = new Intl.RelativeTimeFormat('uk', { numeric: 'auto' })
const DTF = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const DTF_SHORT = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'short',
})
const TIME_F = new Intl.DateTimeFormat('uk-UA', {
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(date) {
  return DTF.format(new Date(date))
}

export function formatDateShort(date) {
  return DTF_SHORT.format(new Date(date))
}

export function formatTime(date) {
  return TIME_F.format(new Date(date))
}

export function formatRelative(date) {
  const d = new Date(date)
  const diff = (d.getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)

  if (abs < 60) return 'щойно'
  if (abs < 3600) return RTF.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return RTF.format(Math.round(diff / 3600), 'hour')
  if (abs < 604800) return RTF.format(Math.round(diff / 86400), 'day')
  return formatDate(date)
}

export function getApiError(err) {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    'Сталася помилка'
  )
}

export const moodLabels = {
  1: 'Жахливо',
  2: 'Дуже погано',
  3: 'Погано',
  4: 'Не дуже',
  5: 'Нормально',
  6: 'Незле',
  7: 'Добре',
  8: 'Дуже добре',
  9: 'Чудово',
  10: 'Прекрасно',
}

export const moodEmoji = {
  1: '😞', 2: '😔', 3: '😟', 4: '😕', 5: '😐',
  6: '🙂', 7: '😊', 8: '😄', 9: '😁', 10: '🤩',
}

export function moodColor(mood) {
  if (mood <= 3) return 'text-warm-500'
  if (mood <= 5) return 'text-cream-500'
  if (mood <= 7) return 'text-sage-400'
  return 'text-sage-600'
}
