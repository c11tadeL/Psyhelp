import {
  Music, Volume2, Pause, Play,
  Bird, Clock, Flame, TreePine, Piano,
  CloudRain, CloudLightning, TrainFront, Waves,
} from 'lucide-react'
import { useSoundPlayer } from '../../hooks/useAudioGenerator'

const SOUNDS = [
  {
    id: 'rain',
    name: 'Дощ',
    icon: CloudRain,
    desc: 'Дощ',
    color: 'from-accent-200 to-accent-300',
  },
  {
    id: 'thunder_rain',
    name: 'Гроза',
    icon: CloudLightning,
    desc: 'Дощ з громом',
    color: 'from-accent-400 to-sage-700',
  },
  {
    id: 'waves',
    name: 'Хвилі',
    icon: Waves,
    desc: 'Морські хвилі біля берега',
    color: 'from-accent-300 to-sage-300',
  },
  {
    id: 'fire',
    name: 'Камін',
    icon: Flame,
    desc: 'Тріск дров у вогнищі',
    color: 'from-warm-200 to-warm-400',
  },
  {
    id: 'birds',
    name: 'Пташки',
    icon: Bird,
    desc: 'Спів пташок у лісі',
    color: 'from-sage-200 to-sage-400',
  },
  {
    id: 'night_forest',
    name: 'Нічний ліс',
    icon: TreePine,
    desc: 'Атмосфера літньої ночі',
    color: 'from-sage-600 to-sage-800',
  },
  {
    id: 'clock',
    name: 'Годинник',
    icon: Clock,
    desc: 'Розмірене цокання',
    color: 'from-cream-200 to-cream-400',
  },
  {
    id: 'train',
    name: 'Поїзд',
    icon: TrainFront,
    desc: 'Монотонний звук вагона',
    color: 'from-warm-300 to-cream-400',
  },
  {
    id: 'piano',
    name: 'Фортепіано',
    icon: Piano,
    desc: 'Спокійна мелодія',
    color: 'from-cream-300 to-warm-200',
  },
]

export function RelaxSounds() {
  const { activeSound, volume, setVolume, toggle, loading } = useSoundPlayer()

  return (
    <div className="card">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Music className="w-5 h-5 text-accent-500" />
        <h3 className="font-display font-bold text-lg text-sage-800">
          Звуки релаксації
        </h3>
      </div>
      <p className="text-sm text-sage-500 mb-6 text-center">
        Оберіть звуковий пейзаж, щоб заспокоїтись і налаштуватись на спокій
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {SOUNDS.map((s) => {
          const isActive = activeSound === s.id
          const isLoading = isActive && loading
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`relative p-4 rounded-xl text-left transition-all group ${
                isActive
                  ? `bg-gradient-to-br ${s.color} ring-2 ring-sage-500 shadow-gentle`
                  : 'bg-cream-50 hover:bg-cream-100 border border-cream-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <Icon
                  className={`w-7 h-7 ${
                    isActive ? 'text-white' : 'text-sage-600'
                  }`}
                  strokeWidth={1.75}
                />
                <span className={isActive ? 'text-white' : 'text-sage-500'}>
                  {isLoading ? (
                    <span className="text-xs">…</span>
                  ) : isActive ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </span>
              </div>
              <p
                className={`font-semibold text-sm ${
                  isActive ? 'text-white' : 'text-sage-800'
                }`}
              >
                {s.name}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isActive ? 'text-white/90' : 'text-sage-500'
                }`}
              >
                {s.desc}
              </p>
            </button>
          )
        })}
      </div>

      {activeSound && (
        <div className="flex items-center gap-3 pt-3 border-t border-cream-100 animate-fade-in">
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
          <span className="text-xs text-sage-500 w-10 text-right tabular-nums">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}