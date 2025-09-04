import React from 'react'
import type { FeedbackCell } from '../domain/types'

const baseRows = [
  'q w e r t y u i o p',
  'a s d f g h j k l',
  'Enter z x c v b n m Backspace'
]

const ltRow = 'ą č ę ė į š ų ū ž'

export function Keyboard({ onKey, keyStates }: { onKey: (k: string) => void; keyStates: Record<string, FeedbackCell> }) {
  const renderKey = (k: string, opts?: { wide?: boolean; small?: boolean }) => {
    const isBack = k === 'Backspace'
    const label = isBack ? '⌫' : k
    const state = keyStates[k.toLowerCase()]
    const base = 'key-btn px-2 py-3 text-sm sm:text-base rounded text-white select-none'
    const size = opts?.wide ? ' key-wide' : opts?.small ? ' key-small' : ''
    const stateCls = state === 'correct'
      ? ' bg-correct'
      : state === 'present'
      ? ' bg-present'
      : state === 'absent'
      ? ' bg-absent'
      : ' bg-gray-500 hover:bg-gray-400 active:bg-gray-600'
    return (
      <button
        key={k}
        aria-label={k}
        className={`${base}${size}${stateCls}`}
        onClick={() => onKey(k)}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-2" aria-label="Lietuviškos raidės">
        {ltRow.split(' ').map(k => renderKey(k, { small: true }))}
      </div>
      {baseRows.map((r, i) => (
        <div key={i} className="flex justify-center gap-2">
          {r.split(' ').map(k =>
            k === 'Enter' || k === 'Backspace'
              ? renderKey(k, { wide: true })
              : renderKey(k)
          )}
        </div>
      ))}
    </div>
  )
}
