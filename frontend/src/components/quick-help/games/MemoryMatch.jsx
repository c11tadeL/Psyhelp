import { useState, useEffect } from 'react'
import { Brain, RotateCcw } from 'lucide-react'

const ICONS = ['🌿', '🌸', '🍃', '🌊', '☁️', '🌙', '⭐', '🌷']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateBoard() {
  const pairs = ICONS.flatMap((icon, i) => [
    { id: i * 2, icon },
    { id: i * 2 + 1, icon },
  ])
  return shuffle(pairs)
}

export function MemoryMatch() {
  const [board, setBoard] = useState(generateBoard())
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [won, setWon] = useState(false)

  useEffect(() => {
    if (matched.length === board.length && board.length > 0) {
      setWon(true)
    }
  }, [matched, board.length])

  useEffect(() => {
    if (flipped.length !== 2) return
    const [first, second] = flipped
    setMoves((m) => m + 1)
    if (board[first].icon === board[second].icon) {
      setMatched((m) => [...m, first, second])
      setFlipped([])
    } else {
      const t = setTimeout(() => setFlipped([]), 800)
      return () => clearTimeout(t)
    }
  }, [flipped, board])

  const handleClick = (idx) => {
    if (flipped.length === 2) return
    if (flipped.includes(idx)) return
    if (matched.includes(idx)) return
    setFlipped((f) => [...f, idx])
  }

  const reset = () => {
    setBoard(generateBoard())
    setFlipped([])
    setMatched([])
    setMoves(0)
    setWon(false)
  }

  const isVisible = (idx) => flipped.includes(idx) || matched.includes(idx)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-warm-500" />
          <h3 className="font-display font-bold text-lg text-sage-800">
            Знайди пару
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-sage tabular-nums">Хід: {moves}</span>
          <button
            onClick={reset}
            className="text-sage-400 hover:text-sage-600"
            title="Нова гра"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-sm text-sage-500 mb-4">
        Знайдіть усі пари — гра на увагу й переключення фокусу
      </p>

      {won && (
        <div className="bg-sage-50 border border-sage-200 rounded-xl p-3 mb-3 text-center animate-fade-in">
          <p className="font-display font-bold text-sage-800">
            Чудово! Усі пари знайдено за {moves} ходів
          </p>
          <button onClick={reset} className="btn-primary mt-2">
            Нова гра
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {board.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => handleClick(idx)}
            className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition-all ${
              isVisible(idx)
                ? matched.includes(idx)
                  ? 'bg-sage-100 border-2 border-sage-300'
                  : 'bg-cream-100 border-2 border-cream-300'
                : 'bg-gradient-to-br from-sage-400 to-sage-500 hover:from-sage-500 hover:to-sage-600'
            }`}
          >
            {isVisible(idx) ? card.icon : ''}
          </button>
        ))}
      </div>
    </div>
  )
}
