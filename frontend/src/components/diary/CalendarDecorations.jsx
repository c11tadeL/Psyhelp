/**
 * CalendarDecorations.jsx — декоративні SVG для тем календаря.
 * Сезонність для теми «Природа», півмісяць для «Сутінки».
 */

/**
 * Визначає сезон за номером місяця.
 * 0=січень → winter, 1=лютий → winter, 2=березень → spring і т.д.
 */
function getSeason(month) {
  if (month === 11 || month === 0 || month === 1) return 'winter'
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  return 'autumn'
}

/** Зимова гілочка з ягідками калини (без листя). */
function WinterBranch() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      {/* Гілка */}
      <path
        d="M10 100 Q40 80 70 50 Q85 35 110 20"
        stroke="#5d8169"
        strokeWidth="2.5"
        fill="none"
        opacity="0.7"
      />
      {/* Маленькі гілочки */}
      <path d="M40 80 L50 70" stroke="#5d8169" strokeWidth="1.5" opacity="0.6" />
      <path d="M70 50 L75 40" stroke="#5d8169" strokeWidth="1.5" opacity="0.6" />
      {/* Ягоди калини */}
      <circle cx="48" cy="68" r="4" fill="#cb8e6a" opacity="0.85" />
      <circle cx="52" cy="73" r="3.5" fill="#cb8e6a" opacity="0.85" />
      <circle cx="55" cy="67" r="3" fill="#cb8e6a" opacity="0.85" />
      <circle cx="77" cy="38" r="3.5" fill="#cb8e6a" opacity="0.85" />
      <circle cx="82" cy="42" r="3" fill="#cb8e6a" opacity="0.85" />
      {/* Сніжинки */}
      <g stroke="#fdfbf7" strokeWidth="0.8" opacity="0.7">
        <line x1="20" y1="30" x2="20" y2="40" />
        <line x1="15" y1="35" x2="25" y2="35" />
        <line x1="90" y1="80" x2="90" y2="90" />
        <line x1="85" y1="85" x2="95" y2="85" />
        <line x1="60" y1="100" x2="60" y2="108" />
        <line x1="56" y1="104" x2="64" y2="104" />
      </g>
    </svg>
  )
}

/** Весняна гілка з ніжними квітами. */
function SpringBranch() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      {/* Гілка */}
      <path
        d="M10 100 Q35 75 60 55 Q85 35 110 25"
        stroke="#496853"
        strokeWidth="2.5"
        fill="none"
        opacity="0.7"
      />
      {/* Малі гілочки */}
      <path d="M35 78 L42 68" stroke="#496853" strokeWidth="1.5" opacity="0.6" />
      <path d="M60 55 L65 47" stroke="#496853" strokeWidth="1.5" opacity="0.6" />
      <path d="M85 38 L92 32" stroke="#496853" strokeWidth="1.5" opacity="0.6" />

      {/* Квіти — 5-пелюсткові */}
      {[
        { cx: 42, cy: 66, scale: 1 },
        { cx: 65, cy: 45, scale: 1.1 },
        { cx: 92, cy: 30, scale: 0.9 },
        { cx: 25, cy: 88, scale: 0.85 },
      ].map((f, i) => (
        <g key={i} transform={`translate(${f.cx} ${f.cy}) scale(${f.scale})`}>
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse
              key={angle}
              cx="0"
              cy="-4"
              rx="2.5"
              ry="4"
              fill="#fde2e8"
              stroke="#e8a4a8"
              strokeWidth="0.5"
              opacity="0.9"
              transform={`rotate(${angle})`}
            />
          ))}
          <circle cx="0" cy="0" r="1.5" fill="#cdaf73" />
        </g>
      ))}

      {/* Молоді листочки */}
      <path d="M48 60 Q52 55 56 60 Q52 64 48 60 Z" fill="#a3bdac" opacity="0.85" />
      <path d="M78 42 Q82 38 86 42 Q82 46 78 42 Z" fill="#a3bdac" opacity="0.85" />
    </svg>
  )
}

/** Літня гілка з повним зеленим листям. */
function SummerBranch() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      {/* Гілка */}
      <path
        d="M10 100 Q40 80 65 55 Q90 35 110 22"
        stroke="#496853"
        strokeWidth="2.5"
        fill="none"
        opacity="0.7"
      />
      {/* Бічні гілочки */}
      <path d="M40 80 L45 70" stroke="#496853" strokeWidth="1.5" opacity="0.6" />
      <path d="M65 55 L72 47" stroke="#496853" strokeWidth="1.5" opacity="0.6" />
      <path d="M90 32 L95 28" stroke="#496853" strokeWidth="1.5" opacity="0.6" />

      {/* Листя — повне, темно-зелене */}
      {[
        { cx: 45, cy: 68, rot: -25, scale: 1.1 },
        { cx: 35, cy: 85, rot: 35, scale: 0.95 },
        { cx: 72, cy: 45, rot: -15, scale: 1.05 },
        { cx: 58, cy: 58, rot: 40, scale: 0.9 },
        { cx: 96, cy: 26, rot: -30, scale: 0.85 },
        { cx: 88, cy: 38, rot: 20, scale: 0.95 },
        { cx: 22, cy: 95, rot: -10, scale: 0.9 },
      ].map((l, i) => (
        <ellipse
          key={i}
          cx={l.cx}
          cy={l.cy}
          rx="3.5"
          ry="7"
          fill="#7c9d87"
          stroke="#496853"
          strokeWidth="0.4"
          opacity="0.85"
          transform={`rotate(${l.rot} ${l.cx} ${l.cy}) scale(${l.scale})`}
          style={{ transformOrigin: `${l.cx}px ${l.cy}px` }}
        />
      ))}
    </svg>
  )
}

/** Осіння гілка з помаранчево-жовтим листям. */
function AutumnBranch() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      {/* Гілка */}
      <path
        d="M10 100 Q40 78 65 53 Q88 33 110 23"
        stroke="#5d4737"
        strokeWidth="2.5"
        fill="none"
        opacity="0.75"
      />
      <path d="M42 76 L48 66" stroke="#5d4737" strokeWidth="1.5" opacity="0.6" />
      <path d="M65 52 L70 44" stroke="#5d4737" strokeWidth="1.5" opacity="0.6" />

      {/* Осіннє листя — теплі кольори */}
      {[
        { cx: 48, cy: 64, rot: -25, fill: '#cb8e6a' },
        { cx: 38, cy: 82, rot: 35, fill: '#cdaf73' },
        { cx: 70, cy: 42, rot: -15, fill: '#cb8e6a' },
        { cx: 55, cy: 58, rot: 40, fill: '#dec896' },
        { cx: 92, cy: 28, rot: -30, fill: '#cb8e6a' },
        { cx: 84, cy: 36, rot: 20, fill: '#cdaf73' },
      ].map((l, i) => (
        <ellipse
          key={i}
          cx={l.cx}
          cy={l.cy}
          rx="3.5"
          ry="7"
          fill={l.fill}
          stroke="#bb7250"
          strokeWidth="0.4"
          opacity="0.9"
          transform={`rotate(${l.rot} ${l.cx} ${l.cy})`}
        />
      ))}

      {/* Опадаючі листочки */}
      <ellipse cx="20" cy="55" rx="2.5" ry="5" fill="#cb8e6a" opacity="0.6" transform="rotate(45 20 55)" />
      <ellipse cx="100" cy="75" rx="2" ry="4" fill="#cdaf73" opacity="0.55" transform="rotate(-30 100 75)" />
      <ellipse cx="65" cy="95" rx="2" ry="4" fill="#cb8e6a" opacity="0.5" transform="rotate(60 65 95)" />
    </svg>
  )
}

/** Півмісяць для теми «Сутінки». */
function CrescentMoon() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      <defs>
        <radialGradient id="moonGlow">
          <stop offset="0%" stopColor="#fdfbf7" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#fdfbf7" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#fdfbf7" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Сяйво навколо місяця */}
      <circle cx="60" cy="60" r="50" fill="url(#moonGlow)" />
      {/* Сам півмісяць */}
      <path
        d="M 70 30 A 35 35 0 1 0 70 90 A 28 28 0 1 1 70 30 Z"
        fill="#f4ecd7"
        opacity="0.85"
      />
      {/* Кратери */}
      <circle cx="55" cy="55" r="3" fill="#dec896" opacity="0.6" />
      <circle cx="65" cy="70" r="2" fill="#dec896" opacity="0.5" />
      <circle cx="50" cy="68" r="1.5" fill="#dec896" opacity="0.5" />
    </svg>
  )
}

/** М'які крапки для теми «Мінімал» — дуже стримана декорація. */
function MinimalAccent() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      {/* Концентричні кола з малою прозорістю */}
      <circle cx="60" cy="60" r="50" fill="none" stroke="#5d8169" strokeWidth="0.5" opacity="0.15" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="#5d8169" strokeWidth="0.5" opacity="0.12" />
      <circle cx="60" cy="60" r="26" fill="none" stroke="#5d8169" strokeWidth="0.5" opacity="0.1" />
      <circle cx="60" cy="60" r="14" fill="none" stroke="#5d8169" strokeWidth="0.5" opacity="0.08" />
      <circle cx="60" cy="60" r="2" fill="#5d8169" opacity="0.3" />
    </svg>
  )
}

/**
 * Головний компонент: повертає декорацію відповідно до теми та місяця.
 * Розміщується абсолютно в куті календаря.
 */
export function CalendarDecoration({ themeId, month }) {
  let content = null

  if (themeId === 'minimal') {
    content = <MinimalAccent />
  } else if (themeId === 'nature') {
    const season = getSeason(month)
    content = {
      winter: <WinterBranch />,
      spring: <SpringBranch />,
      summer: <SummerBranch />,
      autumn: <AutumnBranch />,
    }[season]
  } else if (themeId === 'twilight') {
    content = <CrescentMoon />
  }

  if (!content) return null

  return (
    <div
      className="absolute top-3 right-3 w-24 h-24 sm:w-28 sm:h-28 pointer-events-none opacity-90"
      aria-hidden="true"
    >
      {content}
    </div>
  )
}
