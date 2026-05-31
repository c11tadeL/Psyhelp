/**
 * SeasonIcon.jsx — маленька іконка сезону, що ставиться поряд з назвою місяця.
 * Розмір ~28×28, колір приходить з теми.
 */

function getSeason(month) {
  if (month === 11 || month === 0 || month === 1) return 'winter'
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  return 'autumn'
}

/** Сніжинка — зима. */
function Snowflake({ color }) {
  return (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <g stroke={color} strokeWidth="2" strokeLinecap="round" fill="none">
        {/* 6 променів */}
        <line x1="16" y1="3" x2="16" y2="29" />
        <line x1="5" y1="9" x2="27" y2="23" />
        <line x1="5" y1="23" x2="27" y2="9" />
        {/* Гілочки на верхньому промені */}
        <line x1="16" y1="7" x2="13" y2="4" />
        <line x1="16" y1="7" x2="19" y2="4" />
        <line x1="16" y1="25" x2="13" y2="28" />
        <line x1="16" y1="25" x2="19" y2="28" />
        {/* Гілочки на бічних */}
        <line x1="9" y1="12" x2="6" y2="11" />
        <line x1="9" y1="12" x2="8" y2="9" />
        <line x1="23" y1="20" x2="26" y2="21" />
        <line x1="23" y1="20" x2="24" y2="23" />
        <line x1="9" y1="20" x2="6" y2="21" />
        <line x1="9" y1="20" x2="8" y2="23" />
        <line x1="23" y1="12" x2="26" y2="11" />
        <line x1="23" y1="12" x2="24" y2="9" />
      </g>
      <circle cx="16" cy="16" r="2" fill={color} />
    </svg>
  )
}

/** Квітка сакури — весна. */
function CherryBlossom({ color }) {
  // Перетворюємо sage у рожевий для весни (поза темою)
  const petalColor = color === '#f4ecd7' ? '#fde2e8' : '#f4c2c8'
  const accentColor = color === '#f4ecd7' ? '#f4ecd7' : '#cdaf73'
  return (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      {/* 5 пелюсток */}
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="16"
          cy="9"
          rx="4"
          ry="6"
          fill={petalColor}
          stroke={color}
          strokeWidth="1"
          opacity="0.95"
          transform={`rotate(${angle} 16 16)`}
        />
      ))}
      {/* Серединка */}
      <circle cx="16" cy="16" r="2.5" fill={accentColor} />
      {/* Тичинки */}
      <g stroke={accentColor} strokeWidth="0.8" strokeLinecap="round">
        <line x1="16" y1="16" x2="14" y2="13" />
        <line x1="16" y1="16" x2="18" y2="13" />
        <line x1="16" y1="16" x2="14" y2="19" />
        <line x1="16" y1="16" x2="18" y2="19" />
      </g>
    </svg>
  )
}

/** Сонце — літо. */
function Sun({ color }) {
  return (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      {/* Промені */}
      <g stroke={color} strokeWidth="2" strokeLinecap="round">
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="16" y1="26" x2="16" y2="30" />
        <line x1="2" y1="16" x2="6" y2="16" />
        <line x1="26" y1="16" x2="30" y2="16" />
        <line x1="6" y1="6" x2="9" y2="9" />
        <line x1="23" y1="23" x2="26" y2="26" />
        <line x1="6" y1="26" x2="9" y2="23" />
        <line x1="23" y1="9" x2="26" y2="6" />
      </g>
      {/* Сонце */}
      <circle cx="16" cy="16" r="6" fill={color} opacity="0.3" />
      <circle cx="16" cy="16" r="5" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  )
}

/** Кленовий листок — осінь. */
function MapleLeaf({ color }) {
  // Завжди помаранчевий для осені, незалежно від теми
  const leafColor = color === '#f4ecd7' ? '#dec896' : '#cb8e6a'
  const stemColor = color === '#f4ecd7' ? '#cdaf73' : '#5d4737'
  return (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      {/* Класична форма кленового листка */}
      <path
        d="M16 4
           L18 9
           L23 6
           L21 12
           L26 12
           L22 16
           L27 19
           L21 20
           L23 25
           L18 22
           L17 28
           L16 25
           L15 28
           L14 22
           L9 25
           L11 20
           L5 19
           L10 16
           L6 12
           L11 12
           L9 6
           L14 9
           Z"
        fill={leafColor}
        stroke={stemColor}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Прожилки */}
      <g stroke={stemColor} strokeWidth="0.6" fill="none" opacity="0.7">
        <line x1="16" y1="25" x2="16" y2="10" />
        <line x1="16" y1="14" x2="11" y2="11" />
        <line x1="16" y1="14" x2="21" y2="11" />
        <line x1="16" y1="18" x2="9" y2="17" />
        <line x1="16" y1="18" x2="23" y2="17" />
      </g>
      {/* Стебло */}
      <line x1="16" y1="25" x2="16" y2="29" stroke={stemColor} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function SeasonIcon({ month, color }) {
  const season = getSeason(month)
  const Icon = {
    winter: Snowflake,
    spring: CherryBlossom,
    summer: Sun,
    autumn: MapleLeaf,
  }[season]

  return (
    <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 align-middle" aria-hidden="true">
      <Icon color={color} />
    </span>
  )
}
