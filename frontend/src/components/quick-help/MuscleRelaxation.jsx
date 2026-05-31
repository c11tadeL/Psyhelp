import { useEffect, useState } from 'react'
import { Activity, Pause, Play, RotateCcw } from 'lucide-react'

const MUSCLE_GROUPS = [
  { name: 'Стопи й литки', instruction: 'Натисніть пальцями ніг униз. Напружте литки.' },
  { name: 'Стегна й сідниці', instruction: 'Стисніть м\'язи стегон і сідниць.' },
  { name: 'Живіт', instruction: 'Втягніть живіт усередину, ніби він торкається спини.' },
  { name: 'Груди й спина', instruction: 'Зробіть глибокий вдих і утримайте.' },
  { name: 'Кисті й передпліччя', instruction: 'Стисніть кулаки якомога сильніше.' },
  { name: 'Плечі', instruction: 'Підніміть плечі до вух.' },
  { name: 'Шия', instruction: 'Притисніть підборіддя до грудей.' },
  { name: 'Обличчя', instruction: 'Зморщте обличчя: лоб, очі, рот.' },
]

const TENSE_DURATION = 5
const RELAX_DURATION = 10

export function MuscleRelaxation() {
  const [active, setActive] = useState(false)
  const [groupIdx, setGroupIdx] = useState(0)
  const [phase, setPhase] = useState('tense') // 'tense' | 'relax' | 'done'
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return
    if (phase === 'done') return

    const duration = phase === 'tense' ? TENSE_DURATION : RELAX_DURATION

    if (count >= duration) {
      if (phase === 'tense') {
        setPhase('relax')
        setCount(0)
      } else {
        if (groupIdx < MUSCLE_GROUPS.length - 1) {
          setGroupIdx(groupIdx + 1)
          setPhase('tense')
          setCount(0)
        } else {
          setPhase('done')
          setActive(false)
        }
      }
      return
    }

    const t = setTimeout(() => setCount((c) => c + 1), 1000)
    return () => clearTimeout(t)
  }, [active, count, phase, groupIdx])

  const start = () => {
    setActive(true)
    setGroupIdx(0)
    setPhase('tense')
    setCount(0)
  }

  const stop = () => setActive(false)

  const reset = () => {
    setActive(false)
    setGroupIdx(0)
    setPhase('tense')
    setCount(0)
  }

  const group = MUSCLE_GROUPS[groupIdx]
  const totalDuration = phase === 'tense' ? TENSE_DURATION : RELAX_DURATION
  const progress = totalDuration > 0 ? (count / totalDuration) * 100 : 0

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-5 h-5 text-warm-500" />
        <h3 className="font-display font-bold text-lg text-sage-800">
          М'язова релаксація
        </h3>
      </div>
      <p className="text-sm text-sage-500 mb-4">
        Прогресивна релаксація за Якобсоном: напружте й розслабте 8 груп м'язів
      </p>

      {phase === 'done' ? (
        <div className="text-center py-6 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-sage-100 flex items-center justify-center">
            <Activity className="w-10 h-10 text-sage-600" />
          </div>
          <h4 className="font-display font-bold text-xl text-sage-800 mb-2">
            Готово
          </h4>
          <p className="text-sage-600 mb-5">
            Усі групи м'язів розслаблені. Залишайтеся у цьому стані ще хвилину.
          </p>
          <button onClick={reset} className="btn-secondary">
            <RotateCcw className="w-4 h-4" /> Почати знову
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-sage-500">
                Група {groupIdx + 1} з {MUSCLE_GROUPS.length}
              </span>
              {active && (
                <span
                  className={`badge ${
                    phase === 'tense' ? 'badge-warm' : 'badge-sage'
                  }`}
                >
                  {phase === 'tense' ? 'Напруження' : 'Розслаблення'} ·{' '}
                  {totalDuration - count}с
                </span>
              )}
            </div>
            <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ease-linear ${
                  phase === 'tense' ? 'bg-warm-400' : 'bg-sage-400'
                }`}
                style={{
                  width: active ? `${progress}%` : '0%',
                  transitionDuration: '1s',
                }}
              />
            </div>
          </div>

          <div
            className={`p-5 rounded-xl mb-4 transition-colors ${
              phase === 'tense'
                ? 'bg-warm-50 border border-warm-200'
                : 'bg-sage-50 border border-sage-200'
            }`}
          >
            <h4 className="font-display font-bold text-lg text-sage-900 mb-2">
              {group.name}
            </h4>
            <p className="text-sage-700">
              {phase === 'tense'
                ? group.instruction
                : 'Повністю розслабте цю групу. Відчуйте різницю.'}
            </p>
          </div>

          <div className="flex justify-center gap-2">
            <button
              onClick={active ? stop : start}
              className={active ? 'btn-secondary' : 'btn-primary'}
            >
              {active ? (
                <>
                  <Pause className="w-4 h-4" /> Пауза
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> {groupIdx > 0 ? 'Продовжити' : 'Почати'}
                </>
              )}
            </button>
            {(active || groupIdx > 0) && (
              <button onClick={reset} className="btn-ghost">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
