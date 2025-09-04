import React from 'react'
import type { AttemptResult } from '../domain/types'

export function Board({ attempts, current, shakeCurrent, won }: { attempts: AttemptResult[]; current: string; shakeCurrent?: boolean; won?: boolean }) {
  const rows: { letters: { char: string; state?: string }[] }[] = []
  for (const a of attempts) rows.push({ letters: a.letters })
  if (attempts.length < 6) {
    const fill = current.padEnd(5)
    rows.push({ letters: fill.split('').map(c => ({ char: c || ' ', state: undefined })) })
  }
  while (rows.length < 6) rows.push({ letters: Array(5).fill({ char: ' ', state: undefined }) })

  return (
    <div className="grid gap-2" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
      {rows.map((row, i) => {
        const isSubmittedRow = i < attempts.length && i === attempts.length - 1
        const isCurrentRow = i === attempts.length
        const rowCls = `grid grid-cols-5 gap-2 ${isCurrentRow && shakeCurrent ? 'anim-shake' : ''}`
        return (
        <div key={i} className={rowCls}>
          {row.letters.map((l, j) => {
            const base = 'tile border-2 border-gray-600'
            const stateCls = l.state === 'correct'
              ? 'bg-correct border-correct text-white'
              : l.state === 'present'
              ? 'bg-present border-present text-white'
              : l.state === 'absent'
              ? 'bg-absent border-absent text-white'
              : ''
            // For submitted row, compose animations inline to control stagger and optional win pulse
            const animCls = !isSubmittedRow && (isCurrentRow && l.char.trim() ? 'anim-pop' : '')
            const style = l.state === 'correct'
              ? { backgroundColor: '#6aaa64', borderColor: '#6aaa64', color: '#fff' }
              : l.state === 'present'
              ? { backgroundColor: '#c9b458', borderColor: '#c9b458', color: '#fff' }
              : l.state === 'absent'
              ? { backgroundColor: '#787c7e', borderColor: '#787c7e', color: '#fff' }
              : undefined
            // Staggered flip for submitted row; optional win pulse afterwards for correct tiles
            const extraStyle: React.CSSProperties = {}
            if (isSubmittedRow) {
              const stagger = j * 110
              const animations: string[] = [
                `flip-in 300ms ease-out ${stagger}ms both`,
              ]
              if (won && l.state === 'correct') {
                animations.push(`pulse-win 300ms ease-in-out ${stagger + 300}ms both`)
              }
              extraStyle.animation = animations.join(', ')
            }
            return (
              <div key={j} className={`${base} ${stateCls} ${animCls || ''}`} style={{ ...style, ...extraStyle }}>{l.char.toUpperCase()}</div>
            )
          })}
        </div>
      )})}
    </div>
  )
}
