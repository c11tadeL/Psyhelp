import { useState } from 'react'
import { Brain, Music, Gamepad2, Heart } from 'lucide-react'

import { BreathingExercise } from '../../components/quick-help/BreathingExercise'
import { GroundingExercise } from '../../components/quick-help/GroundingExercise'
import { MuscleRelaxation } from '../../components/quick-help/MuscleRelaxation'
import { AntiStressButton } from '../../components/quick-help/AntiStressButton'
import { RelaxSounds } from '../../components/quick-help/RelaxSounds'
import { BubblePop } from '../../components/quick-help/games/BubblePop'
import { ZenGarden } from '../../components/quick-help/games/ZenGarden'
import { ColorMatch } from '../../components/quick-help/games/ColorMatch'
import { MemoryMatch } from '../../components/quick-help/games/MemoryMatch'
import { FidgetBeads } from '../../components/quick-help/games/FidgetBeads'

const TABS = [
  {
    id: 'techniques',
    label: 'Техніки',
    icon: Brain,
    desc: 'Дихання, заземлення, релаксація',
  },
  {
    id: 'sounds',
    label: 'Звуки',
    icon: Music,
    desc: '9 заспокійливих звуків та білого шуму',
  },
  {
    id: 'games',
    label: 'Ігри',
    icon: Gamepad2,
    desc: 'Фідджети для переключення уваги',
  },
  {
    id: 'instant',
    label: 'Миттєво',
    icon: Heart,
    desc: 'Антистрес-кнопка',
  },
]

export function QuickHelpPage() {
  const [tab, setTab] = useState('techniques')

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`p-4 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-sage-500 text-white shadow-gentle'
                  : 'bg-white border border-cream-200 text-sage-700 hover:bg-cream-50'
              }`}
            >
              <Icon className="w-6 h-6 mb-2" />
              <p className="font-display font-bold text-base">{t.label}</p>
              <p className={`text-xs mt-0.5 ${isActive ? 'text-sage-100' : 'text-sage-500'}`}>
                {t.desc}
              </p>
            </button>
          )
        })}
      </div>

      <div className="animate-fade-in">
        {tab === 'techniques' && (
          <div className="grid lg:grid-cols-2 gap-5">
            <BreathingExercise />
            <GroundingExercise />
            <MuscleRelaxation />
          </div>
        )}

        {tab === 'sounds' && (
            <RelaxSounds />
        )}

        {tab === 'games' && (
          <div className="grid lg:grid-cols-2 gap-5">
            <BubblePop />
            <ZenGarden />
            <ColorMatch />
            <MemoryMatch />
            <FidgetBeads />
          </div>
        )}

        {tab === 'instant' && (
          <div className="max-w-md mx-auto">
            <AntiStressButton />
          </div>
        )}
      </div>

      <div className="mt-12 card-flat bg-warm-50 border-warm-200">
        <p className="text-sm text-sage-700">
          <strong>⚠️ Важливо:</strong> ці інструменти допомагають короткочасно
          заспокоїтись, але не замінюють професійну допомогу. Якщо ви відчуваєте
          гостру кризу — зателефонуйте на гарячу лінію <strong>0 800 100 102</strong> або{' '}
          <strong>7333</strong>.
        </p>
      </div>
    </div>
  )
}
