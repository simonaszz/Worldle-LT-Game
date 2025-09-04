import { describe, it, expect, beforeEach, vi } from 'vitest'
import solutions from '../words/solutions.json'

import { getTodayTarget, loadState, saveState } from '../storage'
import type { GameState } from '../domain/types'

const dummyState = (over: Partial<GameState> = {}): GameState => ({
  current: '',
  attempts: [],
  keyboard: {},
  status: 'playing',
  epochDay: 0,
  targetId: 0,
  version: 0,
  wordlistVersion: 0,
  startedAt: null,
  finishedAt: null,
  ...over,
})

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('storage: getTodayTarget bounds', () => {
  it('clamps negative targetId to first word', () => {
    const s = dummyState({ targetId: -123 })
    const t = getTodayTarget(s)
    expect(t).toBe((solutions as unknown as string[])[0] || 'žodis')
  })

  it('clamps too-large targetId to last word', () => {
    const s = dummyState({ targetId: 999999 })
    const t = getTodayTarget(s)
    const arr = solutions as unknown as string[]
    expect(t).toBe(arr[arr.length - 1] || arr[0] || 'žodis')
  })

  it('returns fallback when list empty', () => {
    const orig = (solutions as any).slice()
    ;(solutions as any).length = 0
    const t = getTodayTarget(dummyState({ targetId: 0 }))
    expect(t).toBe('žodis')
    ;(solutions as any).push(...orig)
  })
})

describe('storage: load/save state guards', () => {
  it('loadState returns empty when storage malformed', () => {
    localStorage.setItem('wordle-lt:state', '{not-json')
    const st = loadState()
    expect(st.status).toBeDefined()
  })

  it('loadState ignores wrong storage version', () => {
    const bad: GameState = dummyState({ version: -1 })
    localStorage.setItem('wordle-lt:state', JSON.stringify(bad))
    const st = loadState()
    expect(st.version).not.toBe(-1)
  })

  it('saveState writes version and wordlistVersion fields', () => {
    const s = dummyState()
    saveState(s)
    const raw = localStorage.getItem('wordle-lt:state')!
    const parsed = JSON.parse(raw)
    expect(parsed.version).toBeDefined()
    expect(parsed.wordlistVersion).toBeDefined()
  })
})
