import React, { useEffect, useMemo, useState } from 'react'
import { Board } from './components/Board'
import { Keyboard } from './components/Keyboard'
import { RulesModal } from './components/RulesModal'
import { StatsModal } from './components/StatsModal'
import { WinNameModal } from './components/WinNameModal'
import { Confetti } from './components/Confetti'
import type { AttemptResult, FeedbackCell, GameState } from './domain/types'
import { baseEpochDay, emptyState, isWin, scoreGuess, validateGuess, WORDLIST_VERSION } from './domain/logic'
import { getTodayTarget, loadState, saveState, recordResult, addLeaderboardEntry } from './storage'

export default function App() {
  const [state, setState] = useState<GameState>(() => loadState())
  const [toast, setToast] = useState<string | null>(null)
  const [nowTs, setNowTs] = useState<number>(Date.now())
  const [showRules, setShowRules] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [shake, setShake] = useState(false)
  const [showWinName, setShowWinName] = useState(false)
  const [winMeta, setWinMeta] = useState<{ attempts: number; timeMs: number | null; hardMode: boolean; epochDay: number } | null>(null)

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
      // Start a fresh random game on new day or wordlist change; keep best time
      setState(s => ({ ...emptyState(), bestTimeMs: s.bestTimeMs }))
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
      // Only start per-guess timer in Hard Mode
      guessDeadline: s.guessDeadline ?? (s.hardMode && s.guessTimeLimitMs ? Date.now() + s.guessTimeLimitMs : null),
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
      // Track letter knowledge for stricter hard mode
      const onlyAbsent = new Set<string>() // letters seen only as absent
      const seenPresentOrCorrect = new Set<string>()
      // Minimum required counts for letters revealed as present/correct across attempts
      const minCount: Record<string, number> = {}
      for (const ar of state.attempts) {
        // Count present/correct per letter for this attempt
        const perAttemptCounts: Record<string, number> = {}
        ar.letters.forEach((l, i) => {
          if (l.state === 'correct') {
            mustAtPos[i] = l.char
            seenPresentOrCorrect.add(l.char)
            perAttemptCounts[l.char] = (perAttemptCounts[l.char] ?? 0) + 1
          } else if (l.state === 'present') {
            mustInclude.add(l.char)
            seenPresentOrCorrect.add(l.char)
            perAttemptCounts[l.char] = (perAttemptCounts[l.char] ?? 0) + 1
          }
        })
        // Mark only-absent letters from this attempt
        ar.letters.forEach(l => {
          if (l.state === 'absent' && !seenPresentOrCorrect.has(l.char)) {
            onlyAbsent.add(l.char)
          }
        })
        // Update global minCount by taking max across attempts
        for (const [ch, c] of Object.entries(perAttemptCounts)) {
          if (!minCount[ch] || c > minCount[ch]!) minCount[ch] = c
        }
      }
      // Remove from onlyAbsent any letter that is required by includes/corrects
      for (const ch of seenPresentOrCorrect) onlyAbsent.delete(ch)
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
      // Enforce minimum counts for revealed letters (duplicates)
      for (const [ch, required] of Object.entries(minCount)) {
        const actual = guess.split('').filter(c => c === ch).length
        if (actual < required) {
          show(`Hard Mode: žodyje turi būti bent ${required} „${ch.toUpperCase()}“. `)
          setShake(true); setTimeout(() => setShake(false), 450)
          return
        }
      }
      // Disallow reusing letters known to be absent (stricter rule)
      for (const ch of onlyAbsent) {
        if (guess.includes(ch)) {
          show(`Hard Mode: nenaudok raidės „${ch.toUpperCase()}“, ji nėra tiksliniame žodyje. `)
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
    setState(s => ({ ...s, attempts, current: '', status, keyboard, finishedAt, bestTimeMs, guessDeadline: null }))
    if (won) {
      const elapsed = state.startedAt && finishedAt ? finishedAt - state.startedAt : null
      const sec = elapsed ? Math.round(elapsed / 1000) : null
      show(sec !== null ? `Puiku! Atspėjai per ${sec}s.` : 'Puiku! Atspėjai!')
      // Prepare leaderboard entry and show name modal
      setWinMeta({ attempts: attempts.length, timeMs: elapsed, hardMode: !!state.hardMode, epochDay: state.epochDay })
      setShowWinName(true)
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
  const guessRemainingMs = state.status === 'playing' && state.guessDeadline ? Math.max(0, state.guessDeadline - nowTs) : null
  function fmt(ms: number | null | undefined) {
    if (!ms || ms < 0) return '-'
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const rem = s % 60
    return m > 0 ? `${m}m ${rem}s` : `${rem}s`
  }

  // Timeout handler: consume one attempt if deadline passed
  useEffect(() => {
    if (state.status !== 'playing') return
    if (!state.guessDeadline) return
    if (Date.now() < state.guessDeadline) return
    // Deadline reached – create a forfeited attempt (current letters marked absent)
    const letters = Array.from({ length: 5 }, (_, i) => {
      const ch = state.current.charAt(i) || ' '
      return { char: ch, state: 'absent' as FeedbackCell }
    })
    const ar: AttemptResult = { letters }
    const attempts = [...state.attempts, ar].slice(0, 6)
    const keyboard = updateKeyboard(ar, state.keyboard)
    const status: GameState['status'] = attempts.length >= 6 ? 'lost' : 'playing'
    const finishedAt = status === 'playing' ? null : Date.now()
    setState(s => ({ ...s, attempts, current: '', keyboard, status, finishedAt, guessDeadline: null }))
    show('Laikas baigėsi – bandymas prarastas.')
    // Vibrate shortly to signal timeout
    if ('vibrate' in navigator) {
      try { navigator.vibrate?.(120) } catch {}
    }
  }, [nowTs, state.guessDeadline, state.status])

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
      <header className="flex items-center justify-between gap-1">
        <h1 className="text-2xl font-bold">Wordle LT</h1>
        <div className="flex gap-2 flex-nowrap justify-end">
          <button className="keyboard-button" onClick={() => setState(s => ({ ...emptyState(), bestTimeMs: s.bestTimeMs }))}>Naujas žaidimas</button>
          <button
            className={`keyboard-button whitespace-nowrap ${state.hardMode ? 'bg-red-600 hover:bg-red-500 ring-2 ring-red-300 shadow-sm btn-pulse' : ''}`}
            onClick={() => setState(s => ({ ...s, hardMode: !s.hardMode, guessDeadline: s.hardMode ? null : s.guessDeadline }))}
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
        {state.status === 'playing' && state.hardMode && state.guessTimeLimitMs && (
          <div className="stat-badge" title="Liko laiko spėjimui">
            <span className="stat-ico">⌛</span>
            <span className="stat-label">Spėjimo laikas</span>
            <strong className="stat-value" data-testid="guess-remaining">{fmt(guessRemainingMs)}</strong>
          </div>
        )}
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
        className="sticky bottom-0 z-10 flex gap-2 justify-center pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] bg-gray-900/60 backdrop-blur-md supports-[backdrop-filter]:bg-gray-900/50 border-t border-white/10 shadow-lg shadow-black/30"
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
      <WinNameModal
        open={showWinName}
        onClose={() => setShowWinName(false)}
        onSubmit={(name) => {
          try {
            if (winMeta) {
              addLeaderboardEntry({
                name,
                epochDay: winMeta.epochDay,
                attempts: winMeta.attempts,
                timeMs: winMeta.timeMs ?? null,
                hardMode: winMeta.hardMode,
                dateISO: new Date().toISOString(),
              })
              // remember last used name
              try { localStorage.setItem('wordle-lt:last-name', name) } catch {}
              show('Vardas išsaugotas lyderių lentelėje!')
            }
          } finally {
            setShowWinName(false)
            setWinMeta(null)
          }
        }}
        defaultName={(() => {
          try { return localStorage.getItem('wordle-lt:last-name') || '' } catch { return '' }
        })()}
      />
    </div>
  )
}
