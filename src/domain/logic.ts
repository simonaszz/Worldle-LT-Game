import type { AttemptResult, FeedbackCell, GameState } from './types'
import solutions from '../words/solutions.json'
import allowed from '../words/allowed.json'

export const WORDLIST_VERSION = 2
export const STORAGE_VERSION = 2

export function normalizeInput(s: string): string {
  // Lowercase only; keep Lithuanian diacritics intact
  return s.toLowerCase()
}

export function validateGuess(raw: string): { ok: true } | { error: string } {
  const guess = normalizeInput(raw)
  // Allow Lithuanian letters with diacritics
  if (!/^[a-ząčęėįšųūž]*$/i.test(guess)) {
    return { error: 'Leidžiamos tik raidės (A–Z ir lietuviškos ąčęėįšųūž).' }
  }
  if (guess.length < 5) {
    return { error: `Žodis per trumpas (${guess.length}/5). Įvesk 5 raidžių žodį.` }
  }
  if (guess.length > 5) {
    return { error: `Žodis per ilgas (${guess.length}/5). Įvesk 5 raidžių žodį.` }
  }
  if (!allowed.includes(guess)) {
    return { error: `Žodyne nėra: "${guess}". Pasirink kitą 5 raidžių žodį.` }
  }
  return { ok: true }
}

export function scoreGuess(guessRaw: string, targetRaw: string): AttemptResult {
  const guess = normalizeInput(guessRaw)
  const target = normalizeInput(targetRaw)
  const letters: { char: string; state?: FeedbackCell }[] = []

  // First pass: mark correct and build target remainder counts
  const targetCounts: Record<string, number> = {}
  for (let i = 0; i < 5; i++) {
    const g = guess.charAt(i)
    const t = target.charAt(i)
    if (g === t) {
      letters.push({ char: g, state: 'correct' })
    } else {
      letters.push({ char: g })
      targetCounts[t] = (targetCounts[t] ?? 0) + 1
    }
  }

  // Second pass: mark present/absent
  for (let i = 0; i < 5; i++) {
    const item = letters[i]!
    if (item.state) continue
    const g = item.char
    if ((targetCounts[g] ?? 0) > 0) {
      item.state = 'present'
      targetCounts[g]! -= 1
    } else {
      item.state = 'absent'
    }
  }

  return { letters: letters as { char: string; state: FeedbackCell }[] }
}

export function isWin(ar: AttemptResult): boolean {
  return ar.letters.every(l => l.state === 'correct')
}

export function baseEpochDay(d: Date = new Date()): number {
  // Local midnight-based days since 2025-01-01
  const base = new Date(2025, 0, 1, 0, 0, 0, 0)
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const ms = startOfDay.getTime() - base.getTime()
  return Math.floor(ms / 86400000)
}

export function pickDailyTarget(epochDay: number, wordlistVersion: number): { index: number; word: string } {
  const len = solutions.length || 1
  const idx = Math.abs((epochDay * 31 + wordlistVersion * 9973) % len)
  const word = (solutions as unknown as string[])[idx] ?? 'žodis'
  return { index: idx, word }
}

export function emptyState(): GameState {
  const today = baseEpochDay()
  const p = pickDailyTarget(today, WORDLIST_VERSION)
  return {
    current: '',
    attempts: [],
    keyboard: {},
    status: 'playing',
    epochDay: today,
    targetId: p.index,
    version: STORAGE_VERSION,
    wordlistVersion: WORDLIST_VERSION,
    startedAt: null,
    finishedAt: null,
    hardMode: false,
  }
}
