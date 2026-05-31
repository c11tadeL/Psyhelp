import { useState } from 'react'
import { Anchor, Eye, Ear, Hand, Wind as WindIcon, Coffee, ChevronRight, RotateCcw, Check } from 'lucide-react'

const STEPS = [
  {
    icon: Eye,
    count: 5,
    sense: 'побачити',
    prompt: 'Назвіть 5 речей, які ви бачите навколо',
    placeholder: 'наприклад: вікно, стілець, лампа...',
    color: 'text-accent-500 bg-accent-50',
  },
  {
    icon: Ear,
    count: 4,
    sense: 'почути',
    prompt: 'Назвіть 4 звуки, які чуєте',
    placeholder: 'наприклад: годинник, машини за вікном, вентилятор...',
    color: 'text-sage-500 bg-sage-50',
  },
  {
    icon: Hand,
    count: 3,
    sense: 'торкнутися',
    prompt: 'Назвіть 3 речі, до яких можете доторкнутися',
    placeholder: 'наприклад: тканина одягу, поверхня столу...',
    color: 'text-warm-500 bg-warm-50',
  },
  {
    icon: WindIcon,
    count: 2,
    sense: 'нюхати',
    prompt: 'Назвіть 2 запахи навколо вас',
    placeholder: 'наприклад: кава, повітря після дощу...',
    color: 'text-accent-500 bg-accent-50',
  },
  {
    icon: Coffee,
    count: 1,
    sense: 'смак',
    prompt: 'Назвіть 1 смак, який ви відчуваєте',
    placeholder: 'наприклад: води, м\'яти, кави...',
    color: 'text-sage-500 bg-sage-50',
  },
]

export function GroundingExercise() {
  const [stepIdx, setStepIdx] = useState(-1)
  const [answers, setAnswers] = useState(STEPS.map((s) => Array(s.count).fill('')))
  const [done, setDone] = useState(false)

  const start = () => {
    setStepIdx(0)
    setAnswers(STEPS.map((s) => Array(s.count).fill('')))
    setDone(false)
  }

  const reset = () => {
    setStepIdx(-1)
    setAnswers(STEPS.map((s) => Array(s.count).fill('')))
    setDone(false)
  }

  const updateAnswer = (idx, value) => {
    const copy = answers.map((a) => [...a])
    copy[stepIdx][idx] = value
    setAnswers(copy)
  }

  const next = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(stepIdx + 1)
    } else {
      setDone(true)
    }
  }

  const currentStep = stepIdx >= 0 ? STEPS[stepIdx] : null
  const filledCount = currentStep
    ? answers[stepIdx].filter((a) => a.trim().length > 0).length
    : 0
  const canProceed = currentStep ? filledCount === currentStep.count : false

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Anchor className="w-5 h-5 text-sage-500" />
        <h3 className="font-display font-bold text-lg text-sage-800">
          Заземлення 5-4-3-2-1
        </h3>
      </div>
      <p className="text-sm text-sage-500 mb-4">
        Техніка проти панічних атак: повертає увагу в тіло і теперішній момент
      </p>

      {stepIdx === -1 ? (
        <div className="text-center py-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-sage-50 flex items-center justify-center">
            <Anchor className="w-10 h-10 text-sage-500" />
          </div>
          <p className="text-sage-700 mb-4 max-w-sm mx-auto">
            Якщо ви відчуваєте тривогу, паніку чи дисоціацію — ця вправа допомагає
            повернутися в тіло через органи чуттів.
          </p>
          <button onClick={start} className="btn-primary">
            Почати вправу
          </button>
        </div>
      ) : done ? (
        <div className="text-center py-6 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-sage-100 flex items-center justify-center">
            <Check className="w-10 h-10 text-sage-600" />
          </div>
          <h4 className="font-display font-bold text-xl text-sage-800 mb-2">
            Вправу завершено
          </h4>
          <p className="text-sage-600 mb-5 max-w-sm mx-auto">
            Зверніть увагу, як ви себе почуваєте зараз порівняно з початком. Прислухайтеся до тіла.
          </p>
          <button onClick={reset} className="btn-secondary">
            <RotateCcw className="w-4 h-4" /> Почати знову
          </button>
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i < stepIdx
                      ? 'w-6 bg-sage-500'
                      : i === stepIdx
                      ? 'w-10 bg-sage-500'
                      : 'w-6 bg-cream-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-sage-500">
              Крок {stepIdx + 1} з {STEPS.length}
            </span>
          </div>

          <div className={`p-4 rounded-xl ${currentStep.color} mb-4`}>
            <div className="flex items-center gap-3">
              <currentStep.icon className="w-8 h-8 flex-shrink-0" />
              <div>
                <p className="font-display font-bold text-2xl">
                  {currentStep.count} речей, які можна {currentStep.sense}
                </p>
                <p className="text-sm opacity-80 mt-0.5">{currentStep.prompt}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {answers[stepIdx].map((value, i) => (
              <input
                key={i}
                type="text"
                value={value}
                onChange={(e) => updateAnswer(i, e.target.value)}
                placeholder={i === 0 ? currentStep.placeholder : `${i + 1}.`}
                className="input"
                autoFocus={i === 0}
              />
            ))}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-sage-500">
              {filledCount} / {currentStep.count}
            </span>
            <button onClick={next} disabled={!canProceed} className="btn-primary">
              {stepIdx === STEPS.length - 1 ? 'Завершити' : 'Далі'}{' '}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
