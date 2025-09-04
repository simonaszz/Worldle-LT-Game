import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { loadStats } from '../storage'
import { baseEpochDay } from '../domain/logic'

export function StatsModal({ open, onClose, animationDuration = 700 }: { open: boolean; onClose: () => void; animationDuration?: number }) {
  if (!open) return null

  const handleRequestClose = () => { onClose() }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleRequestClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stats = useMemo(() => loadStats(), [open])
  const winPercent = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0
  const todayEpoch = useMemo(() => baseEpochDay(), [])
  const closeRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { if (open) closeRef.current?.focus() }, [open])
  // Build aligned 5x7 grid (Mon–Sun columns), ending today
  const last35 = useMemo(() => {
    const arr: { epoch: number; title: string; res: 'win'|'loss'|'none' }[] = []
    const now = new Date()
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // today at 00:00
    const jsDay = base.getDay() // 0..6 (Sun..Sat)
    const monFirstIdx = (jsDay + 6) % 7 // 0..6 (Mon..Sun)
    // Start is Monday of 5th-from-last week so that today lands in correct column
    const startEpoch = todayEpoch - (4 * 7 + monFirstIdx)
    for (let i = 0; i < 35; i++) {
      const epoch = startEpoch + i
      const d = new Date(base)
      d.setDate(base.getDate() - (4 * 7 + monFirstIdx - i))
      const title = d.toLocaleDateString('lt-LT', { month: 'short', day: '2-digit' })
      const res = (stats.resultsByDay as any)[epoch] as ('win'|'loss'|undefined)
      arr.push({ epoch, title, res: res ?? 'none' })
    }
    return arr
  }, [stats.resultsByDay, todayEpoch])

  const maxAttempts = Math.max(1, ...stats.byAttempts)

  // Animated number (odometer-style) for KPI values
  const AnimatedNumber = ({ value, suffix = '', duration = animationDuration }: { value: number; suffix?: string; duration?: number }) => {
    const [display, setDisplay] = useState(0)
    useEffect(() => {
      // If duration is 0 or negative, update immediately to avoid division by zero/Infinity
      if (!duration || duration <= 0) {
        setDisplay(Math.round(value))
        return
      }
      let raf = 0
      const start = performance.now()
      const from = 0
      const to = value
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / duration)
        // easeOutCubic
        const e = 1 - Math.pow(1 - p, 3)
        const v = Math.round(from + (to - from) * e)
        setDisplay(v)
        // Schedule next frame only while animating
        if (p < 1) {
          raf = requestAnimationFrame(step)
        }
      }
      raf = requestAnimationFrame(step)
      return () => cancelAnimationFrame(raf)
    }, [value, duration, open])
    return <span aria-live="polite" className="tabular-nums">{display}{suffix}</span>
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="stats-title" className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4 modal-overlay" onClick={handleRequestClose}>
      <div className="relative z-[10000] bg-gray-800 text-gray-100 rounded p-4 max-w-lg w-full shadow-2xl shadow-black/40 modal-card" role="document" onClick={(e) => e.stopPropagation()}>
        <h2 id="stats-title" className="text-xl font-bold mb-3">📊 Statistika</h2>
        <div className="grid grid-cols-4 gap-3 text-center" role="group" aria-label="KPI">
          <div>
            <div className="text-2xl font-bold"><AnimatedNumber value={stats.gamesPlayed} /></div>
            <div className="text-sm opacity-80">Žaista</div>
          </div>
          <div>
            <div className="text-2xl font-bold"><AnimatedNumber value={stats.wins} /></div>
            <div className="text-sm opacity-80">Laimėta</div>
          </div>
          <div>
            <div className="text-2xl font-bold"><AnimatedNumber value={winPercent} suffix="%" /></div>
            <div className="text-sm opacity-80">Win%</div>
          </div>
          <div>
            <div className="text-2xl font-bold"><AnimatedNumber value={stats.currentStreak} /></div>
            <div className="text-sm opacity-80">Serija</div>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-4 mb-2 flex items-center gap-2">
          <span>🔥 Serija (paskutinės 5 savaitės)</span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-700/70 border border-white/10">Dabartinė: {stats.currentStreak}</span>
        </h3>
        <div className="space-y-1" aria-label="Žaidimų serijos vizualizacija, paskutinės 5 savaitės">
          {Array.from({ length: 5 }).map((_, rowIdx) => (
            <div key={`week-${rowIdx}`} className="flex items-center gap-1">
              {last35.slice(rowIdx * 7, rowIdx * 7 + 7).map((d, idx) => (
                <span
                  key={`streak-${rowIdx}-${idx}`}
                  className={
                    d.res === 'win' ? 'w-2.5 h-2.5 rounded-full bg-green-500' :
                    d.res === 'loss' ? 'w-2.5 h-2.5 rounded-full bg-red-500' : 'w-2.5 h-2.5 rounded-full bg-gray-600/60'
                  }
                  title={`${d.title} • ${d.res === 'win' ? 'Laimėta' : d.res === 'loss' ? 'Pralaimėta' : 'Nežaista'}`}
                  aria-label={`${d.title}: ${d.res === 'win' ? 'laimėta' : d.res === 'loss' ? 'pralaimėta' : 'nežaista'}`}
                />
              ))}
            </div>
          ))}
          <div className="pt-1 text-[10px] opacity-60">Kiekviena eilutė = savaitė</div>
        </div>

        <h3 className="text-lg font-semibold mt-4 mb-2">📈 Bandymų pasiskirstymas</h3>
        <div className="space-y-1">
          {stats.byAttempts.map((v, i) => {
            const pct = stats.wins > 0 ? Math.round((v / Math.max(1, stats.wins)) * 100) : 0
            // maxAttempts is derived as Math.max(1, ...stats.byAttempts), so it's always >= 1.
            // Compute width with a single clamp to remove an unreachable branch and improve testability.
            const w = Math.max(6, Math.round((v / maxAttempts) * 100))
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="w-8 text-right">{i + 1}</span>
                <div className="flex-1 bg-gray-700/60 h-4 rounded">
                  <div className="h-4 bg-green-600 rounded bar-grow" style={{ inlineSize: `${w}%` }} />
                </div>
                <span className="w-10 text-right tabular-nums" title={`${pct}%`}>{v}</span>
              </div>
            )
          })}
        </div>

        <h3 className="text-lg font-semibold mt-4 mb-2">🗓️ Mini kalendorius (5 savaitės)</h3>
        <div className="grid grid-cols-7 gap-1 text-[10px] opacity-80 mb-1 select-none place-items-center">
          {['Pr','An','Tr','Kt','Pn','Št','Sk'].map((w) => (
            <span key={w} className="inline-flex items-center justify-center w-4 h-4">{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 place-items-center">
          {last35.map((d, idx) => (
            <div
              key={idx}
              className={
                d.res === 'win' ? 'w-4 h-4 bg-green-500 rounded-[3px] hover:ring-2 ring-green-300/60' :
                d.res === 'loss' ? 'w-4 h-4 bg-red-500 rounded-[3px] hover:ring-2 ring-red-300/60' : 'w-4 h-4 bg-gray-600/60 rounded-[3px] hover:ring-2 ring-gray-400/40'
              }
              title={`${d.title} • ${d.res === 'win' ? 'Laimėta' : d.res === 'loss' ? 'Pralaimėta' : 'Nežaista'}`}
              aria-label={`${d.title}: ${d.res === 'win' ? 'laimėta' : d.res === 'loss' ? 'pralaimėta' : 'nežaista'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs opacity-80">
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 inline-block rounded-[2px]"></span> Laimėta</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 inline-block rounded-[2px]"></span> Pralaimėta</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-600/60 inline-block rounded-[2px]"></span> Nežaista</div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button ref={closeRef} className="keyboard-button" onClick={handleRequestClose}>Uždaryti</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
