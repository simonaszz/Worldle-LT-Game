import { describe, it, expect, beforeEach } from 'vitest'
import { loadStats, recordResult, type Stats } from '../storage'

// Simple in-memory localStorage mock
class LocalStorageMock {
  store: Record<string, string> = {}
  getItem(key: string) { return this.store[key] ?? null }
  setItem(key: string, val: string) { this.store[key] = String(val) }
  removeItem(key: string) { delete this.store[key] }
  clear() { this.store = {} }
}

// @ts-expect-error override
global.localStorage = new LocalStorageMock()

const STATS_KEY = 'wordle-lt:stats'

function getStats(): Stats { return JSON.parse(localStorage.getItem(STATS_KEY) || '{}') as Stats }

beforeEach(() => {
  localStorage.clear()
})

describe('stats storage', () => {
  it('returns defaults if empty', () => {
    const s = loadStats()
    expect(s.gamesPlayed).toBe(0)
    expect(s.byAttempts).toHaveLength(6)
    expect(Object.keys(s.resultsByDay)).toHaveLength(0)
  })

  it('records a win and increments attempts bucket', () => {
    const s = recordResult(100, 'win', 3)
    expect(s.gamesPlayed).toBe(1)
    expect(s.wins).toBe(1)
    expect(s.byAttempts[2]).toBe(1)
    expect(s.currentStreak).toBe(1)
    expect(s.maxStreak).toBe(1)
  })

  it('prevents double counting same day', () => {
    recordResult(101, 'win', 2)
    const after = recordResult(101, 'win', 4)
    expect(after.gamesPlayed).toBe(1)
    expect(after.byAttempts[1]).toBe(1)
  })

  it('streak grows on consecutive days and resets on loss', () => {
    let s = recordResult(200, 'win', 2)
    s = recordResult(201, 'win', 2)
    expect(s.currentStreak).toBe(2)
    expect(s.maxStreak).toBe(2)

    s = recordResult(203, 'win', 2) // gap day -> new streak starts at 1
    expect(s.currentStreak).toBe(1)
    expect(s.maxStreak).toBe(2)

    s = recordResult(204, 'loss')
    expect(s.currentStreak).toBe(0)
  })
})
