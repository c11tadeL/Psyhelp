export const CALENDAR_THEMES = {
  nature: {
    id: 'nature',
    name: 'Природа',
    description: 'Тепла й затишна',
    preview: 'from-warm-100 to-cream-200',

    container: 'border-0',
    containerStyle: {
      background: 'linear-gradient(135deg, #faf6ec 0%, #f5e9df 50%, #ead0bd 100%)',
    },

    header: 'text-sage-900',
    monthName: 'font-display font-extrabold text-3xl tracking-tight',

    navButton: 'text-sage-700 hover:bg-white/60 rounded-full p-2 transition-all bg-white/40',

    weekdayRow: 'text-warm-500 mb-3',
    weekday: 'font-display font-bold text-sm',

    day: 'bg-white/70 hover:bg-white border border-cream-200 text-sage-800 shadow-soft hover:shadow-gentle rounded-2xl backdrop-blur-sm',
    dayOtherMonth: 'opacity-25',
    daySelected: 'ring-2 ring-sage-500 ring-offset-2 ring-offset-cream-100',
    dayToday: 'bg-gradient-to-br from-sage-300 to-sage-500 text-white font-extrabold border-sage-500 shadow-gentle scale-105',
    dayFuture: 'opacity-30 cursor-not-allowed',

    gridGap: 'gap-3',
    isDark: false,
    iconColor: '#cb8e6a',
  },

  twilight: {
    id: 'twilight',
    name: 'Сутінки',
    description: 'Глибока й спокійна',
    preview: 'from-sage-800 to-accent-500',

    container: 'border-0 shadow-gentle',
    containerStyle: {
      background:
        'radial-gradient(ellipse at top left, #4d769d 0%, #3c5444 35%, #324438 70%, #2a3830 100%)',
    },

    header: 'text-cream-50',
    monthName: 'font-display font-light italic text-2xl tracking-wide',

    navButton: 'text-cream-100 hover:bg-white/15 rounded-full p-2 transition-all bg-white/5 backdrop-blur',

    weekdayRow: 'text-cream-300 mb-3 border-b border-white/10 pb-2',
    weekday: 'font-light text-xs uppercase tracking-[0.2em]',

    day: 'bg-white/10 hover:bg-white/20 border border-white/15 text-cream-50 backdrop-blur-md rounded-xl',
    dayOtherMonth: 'opacity-25',
    daySelected: 'ring-2 ring-cream-100 ring-offset-2 ring-offset-sage-800',
    dayToday: 'bg-cream-50 text-sage-900 font-bold border-cream-100 shadow-gentle',
    dayFuture: 'opacity-20 cursor-not-allowed',

    gridGap: 'gap-2',
    isDark: true,
    iconColor: '#f4ecd7',
  },
}

export const DEFAULT_THEME = 'nature'

const STORAGE_KEY = 'psyhelp_calendar_theme'

export function getStoredTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored || !CALENDAR_THEMES[stored]) return DEFAULT_THEME
  return stored
}

export function setStoredTheme(themeId) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, themeId)
}
