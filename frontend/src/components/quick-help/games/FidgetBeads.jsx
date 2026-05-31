import { useEffect, useRef, useState } from 'react'
import { Circle, RotateCcw } from 'lucide-react'

const COLORS = ['#7c9d87', '#a3bdac', '#cb8e6a', '#dec896', '#6790b6', '#8db0cc']

class Bead {
  constructor(x, y, r, color) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.r = r
    this.color = color
  }

  update(width, height, gravity, friction) {
    this.vy += gravity
    this.x += this.vx
    this.y += this.vy

    // Стіни
    if (this.x - this.r < 0) {
      this.x = this.r
      this.vx *= -0.7
    }
    if (this.x + this.r > width) {
      this.x = width - this.r
      this.vx *= -0.7
    }
    if (this.y - this.r < 0) {
      this.y = this.r
      this.vy *= -0.7
    }
    if (this.y + this.r > height) {
      this.y = height - this.r
      this.vy *= -0.5
      this.vx *= friction
    }
  }
}

function collide(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy)
  const minDist = a.r + b.r
  if (dist < minDist && dist > 0) {
    const overlap = (minDist - dist) / 2
    const nx = dx / dist
    const ny = dy / dist
    a.x -= nx * overlap
    a.y -= ny * overlap
    b.x += nx * overlap
    b.y += ny * overlap

    // Простий обмін імпульсу
    const va = a.vx * nx + a.vy * ny
    const vb = b.vx * nx + b.vy * ny
    const transfer = (vb - va) * 0.5
    a.vx += transfer * nx
    a.vy += transfer * ny
    b.vx -= transfer * nx
    b.vy -= transfer * ny
  }
}

export function FidgetBeads() {
  const canvasRef = useRef(null)
  const beadsRef = useRef([])
  const animRef = useRef(null)
  const tiltRef = useRef({ x: 0, y: 1 })
  const [gravity, setGravity] = useState(0.4)

  const init = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    const beads = []
    const count = 30
    for (let i = 0; i < count; i++) {
      const r = 12 + Math.random() * 6
      beads.push(
        new Bead(
          Math.random() * (canvas.width - 2 * r) + r,
          Math.random() * (canvas.height / 2) + r,
          r,
          COLORS[i % COLORS.length]
        )
      )
    }
    beadsRef.current = beads
  }

  const loop = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Фон
    ctx.fillStyle = '#f4ecd7'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const beads = beadsRef.current
    const gx = tiltRef.current.x * gravity
    const gy = tiltRef.current.y * gravity

    beads.forEach((b) => {
      b.vy += gy
      b.vx += gx
      b.x += b.vx
      b.y += b.vy

      const friction = 0.98
      b.vx *= friction
      b.vy *= friction

      if (b.x - b.r < 0) {
        b.x = b.r
        b.vx *= -0.7
      }
      if (b.x + b.r > canvas.width) {
        b.x = canvas.width - b.r
        b.vx *= -0.7
      }
      if (b.y - b.r < 0) {
        b.y = b.r
        b.vy *= -0.7
      }
      if (b.y + b.r > canvas.height) {
        b.y = canvas.height - b.r
        b.vy *= -0.5
      }
    })

    // Колізії
    for (let i = 0; i < beads.length; i++) {
      for (let j = i + 1; j < beads.length; j++) {
        collide(beads[i], beads[j])
      }
    }

    // Малювання
    beads.forEach((b) => {
      const grad = ctx.createRadialGradient(
        b.x - b.r / 3,
        b.y - b.r / 3,
        b.r / 4,
        b.x,
        b.y,
        b.r
      )
      grad.addColorStop(0, b.color + 'ff')
      grad.addColorStop(1, b.color + '88')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.fill()

      // Блік
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.beginPath()
      ctx.arc(b.x - b.r / 3, b.y - b.r / 3, b.r / 4, 0, Math.PI * 2)
      ctx.fill()
    })

    animRef.current = requestAnimationFrame(loop)
  }

  useEffect(() => {
    init()
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePointer = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const touch = e.touches?.[0]
    const clientX = touch ? touch.clientX : e.clientX
    const clientY = touch ? touch.clientY : e.clientY
    const x = clientX - rect.left - cx
    const y = clientY - rect.top - cy
    const len = Math.hypot(x, y) || 1
    tiltRef.current = { x: x / len, y: y / len }
  }

  const handleShake = () => {
    beadsRef.current.forEach((b) => {
      b.vx += (Math.random() - 0.5) * 30
      b.vy += (Math.random() - 0.5) * 30
    })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Circle className="w-5 h-5 text-warm-400" />
          <h3 className="font-display font-bold text-lg text-sage-800">
            Кульки-фідджет
          </h3>
        </div>
        <button
          onClick={handleShake}
          className="text-sage-500 hover:text-sage-700 text-sm flex items-center gap-1"
          title="Струсити"
        >
          <RotateCcw className="w-4 h-4" /> Струсити
        </button>
      </div>
      <p className="text-sm text-sage-500 mb-3">
        Натискайте і ведіть — кульки перекочуються в напрямку курсора
      </p>

      <canvas
        ref={canvasRef}
        onMouseMove={handlePointer}
        onTouchMove={handlePointer}
        onMouseLeave={() => (tiltRef.current = { x: 0, y: 1 })}
        className="w-full h-64 rounded-xl cursor-pointer touch-none"
      />
    </div>
  )
}
