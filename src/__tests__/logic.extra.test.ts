import { describe, it, expect } from 'vitest'
import { validateGuess, scoreGuess } from '../domain/logic'

describe('logic extra coverage', () => {
  it('validateGuess returns dictionary error for unknown 5-letter word', () => {
    const res = validateGuess('xxxxx')
    expect('error' in res && res.error).toMatch(/Žodyne nėra/)
  })

  it('scoreGuess marks present and decrements target count correctly', () => {
    // target has two A's; guess has two A's, one in correct spot, one elsewhere
    const ar = scoreGuess('abaca', 'aaxxx')
    const states = ar.letters.map(l => l.state)
    // positions: 0 correct (a==a), 1 absent (b not in remainder), 2 present (a present but not at pos), 3 absent (c not in target), 4 absent (a should be absent since only two a's total and one already correct + one present)
    expect(states).toEqual(['correct', 'absent', 'present', 'absent', 'absent'])
  })
})
