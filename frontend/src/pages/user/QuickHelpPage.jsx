import { useEffect, useRef, useState } from 'react'
import { Wind, Heart, Music, Gamepad2, Pause, Play, Volume2 } from 'lucide-react'

const PHASES = [
  { name: 'Вдих', duration: 4, scale: 1.5, color: 'sage-400' },
  { name: 'Затримка', duration: 4, scale: 1.5, color: 'sage-500' },
  { name: 'Видих', duration: 6, scale: 0.8, color: 'sage-300' },
  { name: 'Пауза', duration: 2, scale: 0.8, color: 'sage-200' },
]

function BreathingExercise() {
  const [active, setActive] = useState(false)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [count, setCount] = useState(0)
  const [round, setRound] = useState(0)

  useEffect(() => {
    if (!active) return
    const phase = PHASES[phaseIdx]
    if (count >= phase.duration) {
      const next = (phaseIdx + 1) % PHASES.length
      setPhaseIdx(next)
      setCount(0)
      if (next === 0) setRound((r) => r + 1)
      return
    }
    const t = setTimeout(() => setCount((c) => c + 1), 1000)
    return () => clearTimeout(t)
  }, [active, count, phaseIdx])

  const phase = PHASES[phaseIdx]

  const start = () => {
    setActive(true); setPhaseIdx(0); setCount(0); setRound(0)
  }
  const stop = () => setActive(false)

  return (
    <div className="card text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Wind className="w-5 h-5 text-sage-500" />
        <h3 className="font-display font-bold text-lg text-sage-800">Дихальна вправа</h3>
      </div>
      <p className="text-sm text-sage-500 mb-6">
        Техніка 4-4-6-2: вдих, затримка, видих, пауза
      </p>

      <div className="relative h-64 flex items-center justify-center mb-4">
        <div
          className="absolute rounded-full bg-sage-100 transition-all ease-in-out"
          style={{
            width: 192,
            height: 192,
            transform: `scale(${active ? phase.scale : 1})`,
            transitionDuration: active ? `${phase.duration}s` : '300ms',
          }}
        />
        <div
          className="absolute rounded-full bg-sage-300 transition-all ease-in-out opacity-60"
          style={{
            width: 144,
            height: 144,
            transform: `scale(${active ? phase.scale : 1})`,
            transitionDuration: active ? `${phase.duration}s` : '300ms',
          }}
        />
        <div className="relative z-10 text-center">
          <p className="font-display text-2xl font-bold text-sage-800 mb-1">
            {active ? phase.name : 'Готові?'}
          </p>
          {active && (
            <p className="text-sage-500">
              {phase.duration - count}с
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={active ? stop : start}
          className={active ? 'btn-secondary' : 'btn-primary'}
        >
          {active ? <><Pause className="w-4 h-4" /> Зупинити</> : <><Play className="w-4 h-4" /> Почати</>}
        </button>
      </div>

      {round > 0 && (
        <p className="text-sage-400 text-sm mt-4">Завершено циклів: {round}</p>
      )}
    </div>
  )
}

function AntiStressButton() {
  const [count, setCount] = useState(0)
  const [pulses, setPulses] = useState([])

  const handleClick = (e) => {
    setCount((c) => c + 1)
    const id = Date.now()
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    setPulses((p) => [...p, { id, x, y }])
    setTimeout(() => {
      setPulses((p) => p.filter((pp) => pp.id !== id))
    }, 800)
  }

  return (
    <div className="card text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Heart className="w-5 h-5 text-warm-400" />
        <h3 className="font-display font-bold text-lg text-sage-800">Антистрес-кнопка</h3>
      </div>
      <p className="text-sm text-sage-500 mb-6">
        Натискайте, відчувайте — нехай напруга стікає крапелька за крапелькою
      </p>

      <button
        onClick={handleClick}
        className="relative w-44 h-44 rounded-full bg-gradient-to-br from-sage-300 via-sage-400 to-sage-500 active:scale-95 transition-transform shadow-gentle text-white font-display font-bold text-2xl overflow-hidden"
      >
        <span className="relative z-10">{count}</span>
        {pulses.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-white/40 animate-ping pointer-events-none"
            style={{
              left: p.x - 30,
              top: p.y - 30,
              width: 60,
              height: 60,
            }}
          />
        ))}
      </button>

      <p className="text-sage-400 text-sm mt-4">
        Натискань: {count}
      </p>
    </div>
  )
}

const SOUNDS = [
  { id: 'rain', name: 'Дощ', emoji: '🌧️', desc: 'Заспокійливий шум дощу' },
  { id: 'forest', name: 'Ліс', emoji: '🌲', desc: 'Пташки і шелест листя' },
  { id: 'ocean', name: 'Океан', emoji: '🌊', desc: 'Хвилі біля берега' },
  { id: 'fire', name: 'Камін', emoji: '🔥', desc: 'Тріск дров у вогнищі' },
]

function RelaxSounds() {
  const [active, setActive] = useState(null)
  const [volume, setVolume] = useState(0.5)
  const audioRef = useRef(null)

  const audioUrls = {
    rain: 'https://www.soundjay.com/nature/sounds/rain-01.mp3',
    forest: 'https://www.soundjay.com/nature/sounds/birds-and-nature.mp3',
    ocean: 'https://www.soundjay.com/nature/sounds/ocean-wave-1.mp3',
    fire: 'https://www.soundjay.com/nature/sounds/campfire-1.mp3',
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const toggle = (id) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    if (active === id) {
      setActive(null)
      return
    }
    setActive(id)
    const a = new Audio(audioUrls[id])
    a.loop = true
    a.volume = volume
    a.play().catch(() => {})
    audioRef.current = a
  }

  useEffect(() => {
    return () => audioRef.current?.pause()
  }, [])

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Music className="w-5 h-5 text-accent-500" />
        <h3 className="font-display font-bold text-lg text-sage-800">Звуки релаксації</h3>
      </div>
      <p className="text-sm text-sage-500 mb-4">Природні звуки для розслаблення</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {SOUNDS.map((s) => (
          <button
            key={s.id}
            onClick={() => toggle(s.id)}
            className={`p-4 rounded-xl text-left transition-all ${
              active === s.id
                ? 'bg-sage-100 border-2 border-sage-400'
                : 'bg-cream-50 border-2 border-transparent hover:border-cream-300'
            }`}
          >
            <div className="text-3xl mb-1">{s.emoji}</div>
            <p className="font-semibold text-sage-800">{s.name}</p>
            <p className="text-xs text-sage-500">{s.desc}</p>
          </button>
        ))}
      </div>

      {active && (
        <div className="flex items-center gap-3 pt-3 border-t border-cream-100">
          <Volume2 className="w-4 h-4 text-sage-500" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 accent-sage-500"
          />
          <span className="text-xs text-sage-400 w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}

function MiniGame() {
  const [score, setScore] = useState(0)
  const [bubbles, setBubbles] = useState([])
  const idRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const newBubble = {
        id: ++idRef.current,
        left: Math.random() * 90,
        size: 30 + Math.random() * 40,
        duration: 4 + Math.random() * 3,
      }
      setBubbles((b) => [...b, newBubble])
      setTimeout(() => {
        setBubbles((b) => b.filter((bb) => bb.id !== newBubble.id))
      }, newBubble.duration * 1000)
    }, 800)
    return () => clearInterval(interval)
  }, [])

  const pop = (id) => {
    setBubbles((b) => b.filter((bb) => bb.id !== id))
    setScore((s) => s + 1)
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-warm-400" />
          <h3 className="font-display font-bold text-lg text-sage-800">Лопайте бульбашки</h3>
        </div>
        <span className="badge-sage">Бали: {score}</span>
      </div>
      <p className="text-sm text-sage-500 mb-4">
        Простіше і приємніше за кулькомет. Лопайте — розслабляйтесь.
      </p>

      <div className="relative bg-gradient-to-b from-accent-50 to-sage-50 rounded-xl h-64 overflow-hidden">
        {bubbles.map((b) => (
          <button
            key={b.id}
            onClick={() => pop(b.id)}
            className="absolute bottom-0 rounded-full bg-gradient-to-br from-accent-200 to-accent-300 hover:from-accent-300 hover:to-accent-400 transition-colors cursor-pointer"
            style={{
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              animation: `floatUp ${b.duration}s linear forwards`,
            }}
          />
        ))}
        <style>{`
          @keyframes floatUp {
            from { transform: translateY(0); }
            to { transform: translateY(-280px); }
          }
        `}</style>
      </div>
    </div>
  )
}

export function QuickHelpPage() {
  return (
    <div className="container-app py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-sage-900 mb-2">
          Швидка допомога
        </h1>
        <p className="text-sage-600 max-w-2xl">
          Інструменти, які допомагають заспокоїтися тут і зараз. Доступні без реєстрації.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <BreathingExercise />
        <AntiStressButton />
        <RelaxSounds />
        <MiniGame />
      </div>
    </div>
  )
}
