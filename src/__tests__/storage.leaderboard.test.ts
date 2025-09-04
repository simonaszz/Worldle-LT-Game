import { describe, it, expect, beforeEach } from 'vitest'
import { addLeaderboardEntry, loadLeaderboard, type LeaderEntry } from '../storage'

// Simple in-memory localStorage mock (mirrors storage.test.ts)
class LocalStorageMock {
  store: Record<string, string> = {}
  getItem(key: string) { return this.store[key] ?? null }
  setItem(key: string, val: string) { this.store[key] = String(val) }
  removeItem(key: string) { delete this.store[key] }
  clear() { this.store = {} }
}

// @ts-expect-error override
global.localStorage = new LocalStorageMock()

const LEADER_KEY = 'wordle-lt:leaderboard'

function getRaw(): LeaderEntry[] { return JSON.parse(localStorage.getItem(LEADER_KEY) || '[]') as LeaderEntry[] }

beforeEach(() => {
  localStorage.clear()
})

describe('leaderboard storage', () => {
  it('starts empty', () => {
    const l = loadLeaderboard()
    expect(l).toEqual([])
  })

  it('adds entries and sorts by hardMode, attempts, time, date', () => {
    const base = (p: Partial<LeaderEntry>): LeaderEntry => ({
      name: 'A', epochDay: 100, attempts: 3, timeMs: 10_000, hardMode: false, dateISO: '2025-01-01T00:00:00.000Z', ...p,
    })
    addLeaderboardEntry(base({ name: 'NormSlow', hardMode: false, attempts: 3, timeMs: 20_000, dateISO: '2025-01-01T00:00:00.000Z' }))
    addLeaderboardEntry(base({ name: 'HardFast', hardMode: true, attempts: 3, timeMs: 9_000, dateISO: '2025-01-02T00:00:00.000Z' }))
    addLeaderboardEntry(base({ name: 'HardMoreAttempts', hardMode: true, attempts: 4, timeMs: 5_000, dateISO: '2025-01-03T00:00:00.000Z' }))
    addLeaderboardEntry(base({ name: 'NormLessAttempts', hardMode: false, attempts: 2, timeMs: 40_000, dateISO: '2025-01-04T00:00:00.000Z' }))

    const l = loadLeaderboard()
    // Expected order:
    // 1) HardFast (hard, attempts 3, time 9s)
    // 2) HardMoreAttempts (hard, attempts 4)
    // 3) NormLessAttempts (normal, attempts 2) -> attempts beats NormSlow
    // 4) NormSlow (normal, attempts 3, slower)
    expect(l.map(e => e.name)).toEqual(['HardFast', 'HardMoreAttempts', 'NormLessAttempts', 'NormSlow'])
    expect(getRaw()).toHaveLength(4)
  })

  it('applies limit and persists sorted list', () => {
    for (let i = 0; i < 60; i++) {
      addLeaderboardEntry({ name: `N${i}`, epochDay: i, attempts: 6, timeMs: null, hardMode: false, dateISO: new Date(2025, 0, i + 1).toISOString() }, 50)
    }
    const l = loadLeaderboard()
    expect(l).toHaveLength(50)
  })
})
