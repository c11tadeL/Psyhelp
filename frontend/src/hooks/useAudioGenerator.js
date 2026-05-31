import { useEffect, useRef, useState, useCallback } from 'react'

const SOUND_FILES = {
  birds:        '/sounds/birds.mp3',
  clock:        '/sounds/clock.mp3',
  fire:         '/sounds/fire.mp3',
  night_forest: '/sounds/night_forest.mp3',
  piano:        '/sounds/piano.mp3',
  rain:         '/sounds/rain.mp3',
  thunder_rain: '/sounds/thunder_rain.mp3',
  train:        '/sounds/train.mp3',
  waves:        '/sounds/waves.mp3',
}

export function useSoundPlayer() {
  const [activeSound, setActiveSound] = useState(null)
  const [volume, setVolume] = useState(0.5)
  const [loading, setLoading] = useState(false)

  // Зберігаємо audio і volume у ref — щоб не перестворювати функції при кожній зміні стану
  const audioRef = useRef(null)
  const volumeRef = useRef(0.5)
  const activeSoundRef = useRef(null)

  // Синхронізуємо volumeRef
  useEffect(() => {
    volumeRef.current = volume
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    activeSoundRef.current = null
    setActiveSound(null)
    setLoading(false)
  }, [])

  const playAudio = useCallback((soundId) => {
    const url = SOUND_FILES[soundId]
    if (!url) return

    // Зупиняємо поточний без скидання стану — одразу стартуємо новий
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    const audio = new Audio(url)
    audio.loop = true
    audio.volume = volumeRef.current
    audio.preload = 'auto'

    audioRef.current = audio
    activeSoundRef.current = soundId
    setActiveSound(soundId)
    setLoading(true)

    audio.addEventListener('canplay', () => {
      if (audioRef.current === audio) setLoading(false)
    }, { once: true })

    audio.addEventListener('error', () => {
      console.error('Failed to load sound:', url)
      if (audioRef.current === audio) {
        audioRef.current = null
        activeSoundRef.current = null
        setActiveSound(null)
        setLoading(false)
      }
    })

    audio.play().catch((err) => {
      console.error('Play failed:', err)
      if (audioRef.current === audio) {
        audioRef.current = null
        activeSoundRef.current = null
        setActiveSound(null)
        setLoading(false)
      }
    })
  }, [])

  const toggle = useCallback((soundId) => {
    if (activeSoundRef.current === soundId) {
      stopAudio()
    } else {
      playAudio(soundId)
    }
  }, [playAudio, stopAudio])

  // Очищення при розмонтуванні
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return { activeSound, volume, setVolume, toggle, stop: stopAudio, loading }
}
