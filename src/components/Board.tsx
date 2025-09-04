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
    <div className="grid auto-rows-min gap-y-3 py-3 justify-items-center items-center">
      {rows.map((row, i) => {
        const isSubmittedRow = i < attempts.length && i === attempts.length - 1
        const isCurrentRow = i === attempts.length
        const rowCls = `grid grid-cols-5 gap-2.5 sm:gap-4 px-2 mx-auto ${isSubmittedRow ? 'row-submitted' : ''} ${isSubmittedRow && won ? 'row-won' : ''} ${isCurrentRow && shakeCurrent ? 'anim-shake' : ''}`
        return (
        <div key={i} className={rowCls}>
          {row.letters.map((l, j) => {
            const base = 'tile border border-gray-600'
            const stateCls = l.state === 'correct'
              ? 'bg-correct border-correct text-white'
              : l.state === 'present'
              ? 'bg-present border-present text-white'
              : l.state === 'absent'
              ? 'bg-absent border-absent text-white'
              : ''
            // For submitted row, compose animations inline to control stagger and optional win pulse
            const animCls = isSubmittedRow ? '' : (isCurrentRow && l.char.trim() ? 'anim-pop' : '')
            const inlineAnim = isSubmittedRow
              ? `${'flip-in'} 0.6s ease ${(j * 0.08).toFixed(2)}s forwards` + (won && l.state === 'correct' ? `, ${'pulse-win'} 1s ease 0.7s` : '')
              : ''
            return (
              <div key={j} className={`${base} ${stateCls} ${animCls || ''}`} style={inlineAnim ? { animation: inlineAnim } as React.CSSProperties : undefined}>{l.char.toUpperCase()}</div>
            )
          })}
        </div>
      )})}
    </div>
  )
}
