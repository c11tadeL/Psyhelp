import { useState } from 'react'
import { Heart } from 'lucide-react'

export function AntiStressButton() {
  const [count, setCount] = useState(0)
  const [pulses, setPulses] = useState([])

  const handleClick = (e) => {
    setCount((c) => c + 1)
    const id = Date.now() + Math.random()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setPulses((p) => [...p, { id, x, y }])
    setTimeout(() => {
      setPulses((p) => p.filter((pp) => pp.id !== id))
    }, 800)
  }

  return (
    <div className="card text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Heart className="w-5 h-5 text-warm-400" />
        <h3 className="font-display font-bold text-lg text-sage-800">
          Антистрес-кнопка
        </h3>
      </div>
      <p className="text-sm text-sage-500 mb-6">
        Натискайте, відчувайте — нехай напруга стікає крапелька за крапелькою
      </p>

      <button
        onClick={handleClick}
        className="relative w-44 h-44 rounded-full bg-gradient-to-br from-sage-300 via-sage-400 to-sage-500 active:scale-95 transition-transform shadow-gentle text-white font-display font-bold text-2xl overflow-hidden mx-auto block"
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

      <p className="text-sage-400 text-sm mt-4">Натискань: {count}</p>
    </div>
  )
}
