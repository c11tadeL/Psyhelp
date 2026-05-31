import { useEffect, useRef, useState } from 'react'
import { Trees, RotateCcw } from 'lucide-react'

export function ZenGarden() {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastRef = useRef(null)
  const [strokeColor, setStrokeColor] = useState('#7c9d87')

  const COLORS = [
    { value: '#7c9d87', name: 'Шавлія' },
    { value: '#cb8e6a', name: 'Теракот' },
    { value: '#6790b6', name: 'Море' },
    { value: '#cdaf73', name: 'Пісок' },
    { value: '#4a4339', name: 'Земля' },
  ]

  const fillBackground = (canvas) => {
    const ctx = canvas.getContext('2d')
    // Текстура піску — градієнт + точки
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#f4ecd7')
    gradient.addColorStop(1, '#ecdfba')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Шум для текстури
    ctx.globalAlpha = 0.06
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#8b7355' : '#a0856b'
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        1.5,
        1.5
      )
    }
    ctx.globalAlpha = 1
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      const ctx = canvas.getContext('2d')
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      fillBackground(canvas)
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches?.[0]
    const clientX = touch ? touch.clientX : e.clientX
    const clientY = touch ? touch.clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const start = (e) => {
    e.preventDefault()
    drawingRef.current = true
    lastRef.current = getPos(e)
  }

  const draw = (e) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    const last = lastRef.current

    // Тінь під лінією — ефект слідів на піску
    ctx.strokeStyle = 'rgba(120, 90, 60, 0.15)'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.x + 1, last.y + 2)
    ctx.lineTo(pos.x + 1, pos.y + 2)
    ctx.stroke()

    // Основна лінія
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    lastRef.current = pos
  }

  const stop = () => {
    drawingRef.current = false
    lastRef.current = null
  }

  const reset = () => {
    fillBackground(canvasRef.current)
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trees className="w-5 h-5 text-sage-500" />
          <h3 className="font-display font-bold text-lg text-sage-800">
            Дзен-сад
          </h3>
        </div>
        <button onClick={reset} className="text-sage-400 hover:text-sage-600">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-sage-500 mb-3">
        Малюйте візерунки на піску. Без цілі — просто рухайтеся й дихайте
      </p>

      <div className="flex gap-1.5 mb-3">
        {COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => setStrokeColor(c.value)}
            title={c.name}
            className={`w-7 h-7 rounded-full border-2 transition-all ${
              strokeColor === c.value
                ? 'border-sage-700 scale-110'
                : 'border-white'
            }`}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={stop}
        className="w-full h-64 rounded-xl cursor-crosshair touch-none"
      />
    </div>
  )
}
