import { useEffect, useState } from 'react'
import { Wind, Pause, Play, RotateCcw } from 'lucide-react'

const TECHNIQUES = {
  '4-7-8': {
    name: '4-7-8',
    desc: 'Заспокоєння, допомагає засинати',
    phases: [
      { name: 'Вдих', duration: 4, scale: 1.5 },
      { name: 'Затримка', duration: 7, scale: 1.5 },
      { name: 'Видих', duration: 8, scale: 0.7 },
    ],
  },
  '4-4-4-4': {
    name: 'Box (квадратне)',
    desc: 'Концентрація, контроль стресу',
    phases: [
      { name: 'Вдих', duration: 4, scale: 1.5 },
      { name: 'Затримка', duration: 4, scale: 1.5 },
      { name: 'Видих', duration: 4, scale: 0.7 },
      { name: 'Пауза', duration: 4, scale: 0.7 },
    ],
  },
  'long-exhale': {
    name: 'Подовжений видих',
    desc: 'Зниження тривоги, парасимпатична активація',
    phases: [
      { name: 'Вдих', duration: 4, scale: 1.5 },
      { name: 'Видих', duration: 6, scale: 0.7 },
    ],
  },
  'coherent': {
    name: 'Когерентне',
    desc: 'Балансує нервову систему. Рекомендоване для початку',
    phases: [
      { name: 'Вдих', duration: 5, scale: 1.5 },
      { name: 'Видих', duration: 5, scale: 0.7 },
    ],
  },
}

export function BreathingExercise() {
  const [techniqueId, setTechniqueId] = useState('coherent')
  const [active, setActive] = useState(false)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [count, setCount] = useState(0)
  const [round, setRound] = useState(0)

  const technique = TECHNIQUES[techniqueId]
  const phase = technique.phases[phaseIdx]

  useEffect(() => {
    if (!active) return
    if (count >= phase.duration) {
      const next = (phaseIdx + 1) % technique.phases.length
      setPhaseIdx(next)
      setCount(0)
      if (next === 0) setRound((r) => r + 1)
      return
    }
    const t = setTimeout(() => setCount((c) => c + 1), 1000)
    return () => clearTimeout(t)
  }, [active, count, phaseIdx, phase, technique.phases.length])

  const start = () => {
    setActive(true)
    setPhaseIdx(0)
    setCount(0)
    setRound(0)
  }

  const stop = () => setActive(false)

  const reset = () => {
    setActive(false)
    setPhaseIdx(0)
    setCount(0)
    setRound(0)
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Wind className="w-5 h-5 text-sage-500" />
        <h3 className="font-display font-bold text-lg text-sage-800">
          Дихальна вправа
        </h3>
      </div>
      <p className="text-sm text-sage-500 mb-4">{technique.desc}</p>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {Object.entries(TECHNIQUES).map(([id, t]) => (
          <button
            key={id}
            onClick={() => {
              reset()
              setTechniqueId(id)
            }}
            disabled={active}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
              techniqueId === id
                ? 'bg-sage-500 text-white'
                : 'bg-cream-100 text-sage-600 hover:bg-cream-200'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="relative h-56 flex items-center justify-center mb-4">
        <div
          className="absolute rounded-full bg-sage-100 transition-all ease-in-out"
          style={{
            width: 180,
            height: 180,
            transform: `scale(${active ? phase.scale : 1})`,
            transitionDuration: active ? `${phase.duration}s` : '300ms',
          }}
        />
        <div
          className="absolute rounded-full bg-sage-300 transition-all ease-in-out opacity-50"
          style={{
            width: 130,
            height: 130,
            transform: `scale(${active ? phase.scale : 1})`,
            transitionDuration: active ? `${phase.duration}s` : '300ms',
          }}
        />
        <div className="relative z-10 text-center">
          <p className="font-display text-xl font-bold text-sage-800">
            {active ? phase.name : 'Готові?'}
          </p>
          {active && (
            <p className="text-sage-500 text-sm mt-1 tabular-nums">
              {phase.duration - count}с
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={active ? stop : start} className={active ? 'btn-secondary' : 'btn-primary'}>
          {active ? (
            <>
              <Pause className="w-4 h-4" /> Зупинити
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Почати
            </>
          )}
        </button>
        {round > 0 && (
          <button onClick={reset} className="btn-ghost">
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {round > 0 && (
        <p className="text-sage-400 text-sm text-center mt-3">
          Завершено циклів: <span className="font-semibold">{round}</span>
        </p>
      )}
    </div>
  )
}
