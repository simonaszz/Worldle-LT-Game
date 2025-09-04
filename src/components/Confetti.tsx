import React, { useEffect, useRef } from 'react'

// Lightweight confetti using canvas, auto-disposes after duration
export function Confetti({ duration = 2500 }: { duration?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let running = true
    let start: number | null = null

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7']
    const N = 120
    const parts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.4,
      r: 4 + Math.random() * 6,
      vy: 2 + Math.random() * 3,
      vx: -1 + Math.random() * 2,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    function tick(t: number) {
      if (start === null) start = t // Initialize start time on first call
      const elapsed = t - start
      if (elapsed > duration) running = false
      
      // Calculate fade out alpha in the last 500ms
      const fadeOutStart = duration - 500
      const alpha = elapsed > fadeOutStart 
        ? Math.max(0, 1 - (elapsed - fadeOutStart) / 500)
        : 1
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = alpha
      
      for (const p of parts) {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        if (p.y > canvas.height + 20) {
          p.y = -20
          p.x = Math.random() * canvas.width
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color ?? '#22c55e'
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8)
        ctx.restore()
      }
      
      ctx.globalAlpha = 1 // Reset alpha for next frame
      if (running) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [duration])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden
    />
  )
}
