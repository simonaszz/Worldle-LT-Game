export type FeedbackCell = 'correct' | 'present' | 'absent'

export interface AttemptLetter {
  char: string
  state: FeedbackCell
}

export interface AttemptResult {
  letters: AttemptLetter[]
}

export interface GameState {
  current: string
  attempts: AttemptResult[]
  keyboard: Record<string, FeedbackCell>
  status: 'playing' | 'won' | 'lost'
  epochDay: number
  targetId: number
  version: number
  wordlistVersion: number
  // timing
  startedAt: number | null
  finishedAt: number | null
  bestTimeMs?: number
  // options
  hardMode?: boolean
  // per-guess time limit
  guessTimeLimitMs?: number
  guessDeadline?: number | null
}
