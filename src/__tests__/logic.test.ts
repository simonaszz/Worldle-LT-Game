import { describe, it, expect } from 'vitest'
import { normalizeInput, validateGuess, scoreGuess, isWin, pickDailyTarget, baseEpochDay, WORDLIST_VERSION } from '../domain/logic'

describe('normalizeInput', () => {
  it('lowercases (diacritics preserved for LT)', () => {
    expect(normalizeInput('ĄČĘĖĮŠŲŪŽ')).toBe('ąčęėįšųūž')
    expect(normalizeInput('MĖSA')).toBe('mėsa')
  })
})

describe('validateGuess', () => {
  it('rejects non-letter characters', () => {
    expect('ok' in validateGuess('ab1de')).toBe(false)
  })
  it('rejects too short', () => {
    const r = validateGuess('ab')
    if ('error' in r) {
      expect(r.error).toContain('trumpas')
    } else {
      throw new Error('should not be ok')
    }
  })
  it('rejects too long', () => {
    const r = validateGuess('abcdef')
    if ('error' in r) {
      expect(r.error).toContain('ilgas')
    } else {
      throw new Error('should not be ok')
    }
  })
})

describe('scoreGuess', () => {
  it('scores all correct', () => {
    const r = scoreGuess('zodis', 'zodis')
    expect(isWin(r)).toBe(true)
    expect(r.letters.every(l => l.state === 'correct')).toBe(true)
  })
  it('handles double letters correctly', () => {
    const r = scoreGuess('apple', 'ample')
    const states = r.letters.map(l => l.state)
    expect(states).toEqual(['correct','absent','correct','correct','correct'])
  })
})

describe('pickDailyTarget', () => {
  it('is deterministic based on epochDay and wordlistVersion', () => {
    const e = 100
    const p = pickDailyTarget(e, WORDLIST_VERSION)
    const p2 = pickDailyTarget(e, WORDLIST_VERSION)
    expect(p.index).toBe(p2.index)
  })
})

describe('baseEpochDay', () => {
  it('computes days since 2025-01-01 local midnight', () => {
    const d = new Date(2025, 0, 2, 12, 0, 0)
    expect(baseEpochDay(d)).toBe(1)
  })
})
