import { useState, useEffect } from 'react'
import { Target, Check, X } from 'lucide-react'

const WORDS = [
  { text: 'ЧЕРВОНИЙ', value: 'red' },
  { text: 'ЗЕЛЕНИЙ', value: 'green' },
  { text: 'СИНІЙ', value: 'blue' },
  { text: 'ЖОВТИЙ', value: 'yellow' },
  { text: 'ФІОЛЕТОВИЙ', value: 'purple' },
]

const COLORS = {
  red: '#cb8e6a',
  green: '#7c9d87',
  blue: '#6790b6',
  yellow: '#cdaf73',
  purple: '#9d6da3',
}

const COLOR_LABELS = {
  red: 'Червоний',
  green: 'Зелений',
  blue: 'Синій',
  yellow: 'Жовтий',
  purple: 'Фіолетовий',
}

function generateRound() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]
  // Колір тексту НЕ збігається зі словом у 70% випадків
  const otherColors = WORDS.filter((w) => w.value !== word.value)
  const colorValue =
    Math.random() < 0.3
      ? word.value
      : otherColors[Math.floor(Math.random() * otherColors.length)].value
  return { word: word.text, color: colorValue }
}

export function ColorMatch() {
  const [round, setRound] = useState(generateRound())
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState(null)

  const handleAnswer = (chosen) => {
    const correct = chosen === round.color
    setFeedback(correct ? 'correct' : 'wrong')
    if (correct) {
      setScore((s) => s + 1)
      setStreak((s) => s + 1)
    } else {
      setStreak(0)
    }
    setTimeout(() => {
      setFeedback(null)
      setRound(generateRound())
    }, 600)
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-accent-500" />
          <h3 className="font-display font-bold text-lg text-sage-800">
            Концентрація
          </h3>
        </div>
        <div className="flex gap-2">
          <span className="badge-sage tabular-nums">{score}</span>
          {streak > 1 && (
            <span className="badge-warm tabular-nums">🔥 {streak}</span>
          )}
        </div>
      </div>
      <p className="text-sm text-sage-500 mb-4">
        Виберіть <strong>колір тексту</strong>, ігноруючи саме слово
      </p>

      <div className="bg-cream-50 rounded-xl p-8 text-center mb-4 min-h-[120px] flex items-center justify-center">
        <p
          className={`font-display font-extrabold text-3xl sm:text-4xl select-none transition-all ${
            feedback === 'correct'
              ? 'scale-110'
              : feedback === 'wrong'
              ? 'scale-95'
              : ''
          }`}
          style={{ color: COLORS[round.color] }}
        >
          {round.word}
        </p>
        {feedback && (
          <div className="absolute">
            {feedback === 'correct' ? (
              <Check className="w-12 h-12 text-sage-500 animate-fade-in" />
            ) : (
              <X className="w-12 h-12 text-warm-400 animate-fade-in" />
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {Object.entries(COLORS).map(([key, hex]) => (
          <button
            key={key}
            onClick={() => handleAnswer(key)}
            disabled={!!feedback}
            className="aspect-square rounded-xl transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 shadow-soft"
            style={{ backgroundColor: hex }}
            title={COLOR_LABELS[key]}
          />
        ))}
      </div>
    </div>
  )
}
