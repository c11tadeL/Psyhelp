import { useEffect, useRef, useState } from 'react'
import { Gamepad2, Sparkles } from 'lucide-react'

export function BubblePop() {
  const [score, setScore] = useState(0)
  const [bubbles, setBubbles] = useState([])
  const idRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const newBubble = {
        id: ++idRef.current,
        left: Math.random() * 88,
        size: 30 + Math.random() * 40,
        duration: 4 + Math.random() * 3,
      }
      setBubbles((b) => [...b, newBubble])
      setTimeout(() => {
        setBubbles((b) => b.filter((bb) => bb.id !== newBubble.id))
      }, newBubble.duration * 1000)
    }, 700)
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
          <Sparkles className="w-5 h-5 text-accent-500" />
          <h3 className="font-display font-bold text-lg text-sage-800">
            Лопайте бульбашки
          </h3>
        </div>
        <span className="badge-sage tabular-nums">Бали: {score}</span>
      </div>
      <p className="text-sm text-sage-500 mb-4">
        Лопайте бульбашки — простий фідджет, що допомагає переключити увагу
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
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(-280px); opacity: 0.3; }
          }
        `}</style>
      </div>
    </div>
  )
}
