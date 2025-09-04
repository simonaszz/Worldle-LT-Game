import React, { useEffect, useMemo, useState } from 'react'
import { Board } from './components/Board'
import { Keyboard } from './components/Keyboard'
import { RulesModal } from './components/RulesModal'
import { StatsModal } from './components/StatsModal'
import { Confetti } from './components/Confetti'
import type { AttemptResult, FeedbackCell, GameState } from './domain/types'
import { baseEpochDay, emptyState, isWin, pickDailyTarget, scoreGuess, validateGuess, WORDLIST_VERSION } from './domain/logic'
import { getTodayTarget, loadState, saveState, recordResult } from './storage'

export default function App() {
  const [state, setState] = useState<GameState>(() => loadState())
  const [toast, setToast] = useState<string | null>(null)
  const [nowTs, setNowTs] = useState<number>(Date.now())
  const [showRules, setShowRules] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [shake, setShake] = useState(false)

  const target = useMemo(() => getTodayTarget(state), [state.epochDay, state.targetId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.status !== 'playing') return
      if (e.key === 'Enter') submit()
      else if (e.key === 'Backspace') backspace()
      else if (/^[a-ząčęėįšųūž]$/i.test(e.key)) type(e.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state])

  useEffect(() => { saveState(state) }, [state])

  // Tick every second while playing for live timer display
  useEffect(() => {
    if (state.status !== 'playing' || !state.startedAt) return
    const id = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [state.status, state.startedAt])

  useEffect(() => {
    const today = baseEpochDay()
    if (state.epochDay !== today || state.wordlistVersion !== WORDLIST_VERSION) {
      const t = pickDailyTarget(today, WORDLIST_VERSION)
      // Preserve bestTimeMs across days
      setState(s => ({ ...emptyState(), epochDay: today, targetId: t.index, bestTimeMs: s.bestTimeMs }))
    }
  }, [])

  function show(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 5000)
  }

  function type(k: string) {
    if (state.current.length >= 5) return
    setState(s => ({
      ...s,
      current: (s.current + k.toLowerCase()).slice(0, 5),
      startedAt: s.startedAt ?? Date.now(),
    }))
  }

  function backspace() {
    setState(s => ({ ...s, current: s.current.slice(0, -1) }))
  }

  function updateKeyboard(ar: AttemptResult, prev: Record<string, FeedbackCell>) {
    const order: Record<FeedbackCell, number> = { absent: 0, present: 1, correct: 2 }
    const next = { ...prev }
    for (const l of ar.letters) {
      const k = l.char
      const st = l.state
      const prevSt = next[k]
      if (!prevSt || order[st] > order[prevSt]) next[k] = st
    }
    return next
  }

  function submit() {
    // Hard Mode enforcement: must use revealed hints from prior attempts
    if (state.hardMode && state.attempts.length > 0) {
      const guess = state.current.toLowerCase()
      // greens by position
      const mustAtPos: Record<number, string> = {}
      const mustInclude = new Set<string>()
      for (const ar of state.attempts) {
        ar.letters.forEach((l, i) => {
          if (l.state === 'correct') mustAtPos[i] = l.char
          if (l.state === 'present') mustInclude.add(l.char)
        })
      }
      for (const [iStr, ch] of Object.entries(mustAtPos)) {
        const i = Number(iStr)
        if (guess.length === 5 && guess[i] !== ch) {
          show(`Hard Mode: ${i + 1}-oje vietoje turi būti „${ch.toUpperCase()}“. `)
          setShake(true); setTimeout(() => setShake(false), 450)
          return
        }
      }
      for (const ch of mustInclude) {
        if (!guess.includes(ch)) {
          show(`Hard Mode: žodyje privalo būti „${ch.toUpperCase()}“. `)
          setShake(true); setTimeout(() => setShake(false), 450)
          return
        }
      }
    }
    const v = validateGuess(state.current)
    if ('error' in v) {
      show(v.error)
      setShake(true)
      if ('vibrate' in navigator) {
        try { navigator.vibrate?.(120) } catch {}
      }
      setTimeout(() => setShake(false), 450)
      return
    }
    const ar = scoreGuess(state.current, target)
    const won = isWin(ar)
    const attempts = [...state.attempts, ar].slice(0, 6)
    const keyboard = updateKeyboard(ar, state.keyboard)
    const status: GameState['status'] = won ? 'won' : attempts.length >= 6 ? 'lost' : 'playing'
    const finishedAt = status === 'playing' ? null : Date.now()
    // Compute best time on win
    let bestTimeMs = state.bestTimeMs
    if (won && state.startedAt && finishedAt) {
      const elapsed = finishedAt - state.startedAt
      bestTimeMs = bestTimeMs ? Math.min(bestTimeMs, elapsed) : elapsed
    }
    // Record stats if game finished (once per day safeguarded in recordResult)
    if (status !== 'playing') {
      try {
        recordResult(state.epochDay, won ? 'win' : 'loss', won ? attempts.length : undefined)
      } catch {}
    }
    // Always clear the typing row so only the colored submitted row remains visible
    setState(s => ({ ...s, attempts, current: '', status, keyboard, finishedAt, bestTimeMs }))
    if (won) {
      const elapsed = state.startedAt && finishedAt ? finishedAt - state.startedAt : null
      const sec = elapsed ? Math.round(elapsed / 1000) : null
      show(sec !== null ? `Puiku! Atspėjai per ${sec}s.` : 'Puiku! Atspėjai!')
    } else if (attempts.length >= 6) {
      show(`Bandymų nebeliko. Teisingas žodis: ${target.toUpperCase()}.`)
    }
  }

  function onKey(k: string) {
    if (k === 'Enter') submit()
    else if (k === 'Backspace') backspace()
    else if (/^[a-ząčęėįšųūž]$/i.test(k)) type(k)
  }

  const runningMs = state.startedAt && state.status === 'playing' ? nowTs - state.startedAt : null
  function fmt(ms: number | null | undefined) {
    if (!ms || ms < 0) return '-'
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const rem = s % 60
    return m > 0 ? `${m}m ${rem}s` : `${rem}s`
  }

  function buildShareText(): string {
    const headerAttempts = state.status === 'won' ? state.attempts.length : 6
    const header = `Wordle LT ${state.epochDay} ${headerAttempts}/6`
    const rows = state.attempts.map(ar => ar.letters.map(l => l.state === 'correct' ? '🟩' : l.state === 'present' ? '🟨' : '⬛').join(''))
    const url = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
    return [header, ...rows, '', url].join('\n')
  }

  async function onShare() {
    const text = buildShareText()
    try {
      await navigator.clipboard.writeText(text)
      show('Rezultatas nukopijuotas!')
    } catch {
      // Fallback: prompt
      const ok = window.prompt('Kopijuok rezultatą:', text)
      if (ok !== null) show('Rezultatas paruoštas kopijavimui.')
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-3 app-card" aria-live="polite">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Wordle LT</h1>
        <div className="flex gap-2 flex-nowrap justify-end">
          <button className="keyboard-button" onClick={() => setState(s => ({ ...emptyState(), bestTimeMs: s.bestTimeMs }))}>Naujas žaidimas</button>
          <button
            className={`keyboard-button whitespace-nowrap ${state.hardMode ? 'bg-red-600 hover:bg-red-500 ring-2 ring-red-300 shadow-sm btn-pulse' : ''}`}
            onClick={() => setState(s => ({ ...s, hardMode: !s.hardMode }))}
            title={state.hardMode ? 'Sunkus režimas įjungtas' : 'Sunkus režimas išjungtas'}
            aria-pressed={state.hardMode}
            aria-label={state.hardMode ? 'Sunku įjungta' : 'Sunku išjungta'}
          >
            ⚡ Sunku
          </button>
        </div>
      </header>

      <section aria-label="Žaidimo statistika" className="stats-bar">
        <div className="stat-badge" title="Praėjęs laikas">
          <span className="stat-ico">⏱️</span>
          <span className="stat-label">Laikas</span>
          <strong className="stat-value" data-testid="elapsed-time">{fmt(runningMs ?? (state.finishedAt && state.startedAt ? state.finishedAt - state.startedAt : null))}</strong>
        </div>
        <div className="stat-badge" title="Geriausias laikas">
          <span className="stat-ico">🏅</span>
          <span className="stat-label">Rekordas</span>
          <strong className="stat-value" data-testid="best-time">{fmt(state.bestTimeMs)}</strong>
        </div>
      </section>

      <Board attempts={state.attempts} current={state.current} shakeCurrent={shake} won={state.status === 'won'} />
      {state.status === 'won' && <Confetti />}

      {/* Bottom actions: Rules & Stats above keyboard (all sizes) */}
      <div
        className="sticky bottom-0 z-10 flex gap-2 justify-center pt-2 pb-2 bg-gray-900/60 backdrop-blur-md supports-[backdrop-filter]:bg-gray-900/50 border-t border-white/10 shadow-lg shadow-black/30"
        style={{ paddingBlockEnd: 'env(safe-area-inset-bottom)' }}
      >
        <button className="keyboard-button" onClick={() => setShowStats(true)}>📊 Statistika</button>
        <button className="keyboard-button" onClick={() => setShowRules(true)}>📜 Taisyklės</button>
      </div>

      <Keyboard onKey={onKey} keyStates={state.keyboard} />

      {state.status !== 'playing' && (
        <div className="flex justify-center">
          <button className="keyboard-button" onClick={onShare}>Kopijuoti rezultatą</button>
        </div>
      )}

      {toast && (
        <div role="status" className="toast fixed bottom-4 left-1/2 -translate-x-1/2">
          {toast}
        </div>
      )}

      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
      <StatsModal open={showStats} onClose={() => setShowStats(false)} />
    </div>
  )
}
