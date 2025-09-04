import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { Board } from '../components/Board'
import type { AttemptResult } from '../domain/types'

function makeAttempt(letters: Array<[string, 'correct'|'present'|'absent']>): AttemptResult {
  return { letters: letters.map(([char, state]) => ({ char, state })) as any }
}

describe('Board', () => {
  it('renders 6 rows and 5 tiles per row', () => {
    render(<Board attempts={[]} current="" />)
    const tiles = document.querySelectorAll('.tile')
    expect(tiles.length).toBe(6 * 5)
  })

  it('applies flip animation on submitted row and pop on current input, shake when requested', () => {
    const attempts: AttemptResult[] = [
      makeAttempt([
        ['a', 'correct'],
        ['b', 'present'],
        ['c', 'absent'],
        ['d', 'correct'],
        ['e', 'present'],
      ]),
    ]
    render(<Board attempts={attempts} current={'ž'} shakeCurrent={true} won={true} />)

    const rows = document.querySelectorAll('.grid.grid-cols-5')
    expect(rows.length).toBe(6)

    // Last submitted row should have inline animation style on tiles
    const submittedTiles = rows[0].querySelectorAll('.tile')
    expect(submittedTiles.length).toBe(5)
    submittedTiles.forEach((t) => {
      const style = (t as HTMLElement).style.animation
      expect(style).toMatch(/flip-in/)
    })

    // Correct cells get optional pulse-win when won
    const correctTiles = Array.from(submittedTiles).filter(t => (t as HTMLElement).style.animation.includes('pulse-win'))
    expect(correctTiles.length).toBeGreaterThan(0)

    // Current row has pop animation on filled letter and row has shake class
    const currentRow = rows[1]
    expect(currentRow.className).toMatch(/anim-shake/)
    const popTile = Array.from(currentRow.querySelectorAll('.tile')).find(t => t.className.includes('anim-pop'))
    expect(popTile).toBeTruthy()
  })
})
