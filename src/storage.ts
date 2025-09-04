import type { GameState } from './domain/types'
import { STORAGE_VERSION, WORDLIST_VERSION, emptyState } from './domain/logic'
import solutions from './words/solutions.json'

const KEY = 'wordle-lt:state'
const STATS_KEY = 'wordle-lt:stats'

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const data = JSON.parse(raw) as GameState
    if (data.version !== STORAGE_VERSION) return emptyState()
    return data
  } catch {
    return emptyState()
  }
}

export function saveState(state: GameState): void {
  const s = { ...state, version: STORAGE_VERSION, wordlistVersion: WORDLIST_VERSION }
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function getTodayTarget(state: GameState): string {
  const idx = Math.max(0, Math.min(solutions.length - 1, state.targetId))
  const arr = solutions as unknown as string[]
  return arr[idx] || arr[0] || 'žodis'
}

// --- Stats storage ---
export type DayResult = 'win' | 'loss'
export interface Stats {
  gamesPlayed: number
  wins: number
  byAttempts: number[] // index 0..5 corresponds to 1..6 tries
  currentStreak: number
  maxStreak: number
  lastPlayedDay?: number
  resultsByDay: Record<number, DayResult>
}

function defaultStats(): Stats {
  return {
    gamesPlayed: 0,
    wins: 0,
    byAttempts: [0, 0, 0, 0, 0, 0],
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDay: undefined,
    resultsByDay: {},
  }
}

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return defaultStats()
    const data = JSON.parse(raw) as Stats
    // basic shape guard
    if (!Array.isArray(data.byAttempts) || data.byAttempts.length !== 6) return defaultStats()
    return { ...defaultStats(), ...data }
  } catch {
    return defaultStats()
  }
}

export function saveStats(stats: Stats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

export function recordResult(epochDay: number, result: DayResult, attemptsCount?: number): Stats {
  const s = loadStats()
  // Prevent double counting the same day
  if (s.resultsByDay[epochDay]) return s
  s.resultsByDay[epochDay] = result
  s.gamesPlayed += 1
  if (result === 'win') {
    s.wins += 1
    const idx = attemptsCount && attemptsCount >= 1 && attemptsCount <= 6 ? attemptsCount - 1 : 5
    s.byAttempts[idx] = (s.byAttempts[idx] || 0) + 1
    // streak logic counts only consecutive days; break on gap or loss
    if (s.lastPlayedDay !== undefined && epochDay === s.lastPlayedDay + 1) {
      s.currentStreak += 1
    } else {
      s.currentStreak = 1
    }
    if (s.currentStreak > s.maxStreak) s.maxStreak = s.currentStreak
  } else {
    // loss breaks streak
    s.currentStreak = 0
  }
  s.lastPlayedDay = epochDay
  saveStats(s)
  return s
}
