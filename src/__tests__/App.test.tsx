import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

function clickKey(label: string) {
  const btn = screen.getByRole('button', { name: label })
  fireEvent.click(btn)
}

describe('App integration', () => {
  it('allows typing via on-screen keyboard, backspacing, and shows error for short word', async () => {
    const { default: App } = await import('../App')
    // Clean again in case App import touched storage
    localStorage.clear()
    render(<App />)

    clickKey('a')
    clickKey('b')

    clickKey('Backspace')

    clickKey('Enter')

    const toast = await screen.findByRole('status')
    expect(toast.textContent?.toLowerCase()).toContain('trumpas')
  })

  it('registers a win and preserves best time after New Game', async () => {
    // Mock today target to a simple word 'aaaaa' BEFORE importing App
    vi.resetModules()
    // Ensure clean storage
    localStorage.clear()
    // Mock storage target
    vi.doMock('../storage', async (orig) => {
      const mod = await orig<any>()
      return { ...mod, getTodayTarget: () => 'aaaaa' }
    })
    // Mock Confetti to a noop to avoid canvas in jsdom
    vi.doMock('../components/Confetti', () => ({
      Confetti: () => null,
      __esModule: true,
    }))
    // Mock logic to accept any 5-letter guess and compute a win when equal to target
    vi.doMock('../domain/logic', async (orig) => {
      const mod = await orig<any>()
      return {
        ...mod,
        validateGuess: () => ({ ok: true } as const),
        scoreGuess: (guessRaw: string, targetRaw: string) => {
          const letters = Array.from({ length: 5 }, (_, i) => {
            const g = guessRaw[i] ?? ''
            const t = targetRaw[i] ?? ''
            return { char: g, state: g === t ? 'correct' : 'absent' }
          })
          return { letters }
        },
        isWin: (ar: any) => ar.letters.every((l: any) => l.state === 'correct'),
      }
    })
    const { default: App } = await import('../App')

    // Freeze time to simulate duration
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 1, 12, 0, 0))

    render(<App />)

    // Type via on-screen keyboard
    for (let i = 0; i < 5; i++) {
      const btn = screen.getByRole('button', { name: 'a' })
      fireEvent.click(btn)
    }
    // Advance time by 3 seconds to get a best time, then submit via Enter button
    vi.setSystemTime(new Date(2025, 0, 1, 12, 0, 3))
    const enterBtn = screen.getByRole('button', { name: 'Enter' })
    fireEvent.click(enterBtn)
    // Switch back to real timers before waitFor (RTL uses real timers)
    vi.useRealTimers()

    // Rekordas (best time) should update to 3s
    const cardBefore = screen.getByTestId('best-time')
    await waitFor(() => {
      expect(cardBefore.textContent).toContain('3s')
    })

    // Click New Game and ensure rekordas persists
    const newGame = screen.getByRole('button', { name: 'Naujas žaidimas' })
    fireEvent.click(newGame)
    const cardAfter = screen.getByTestId('best-time')
    await waitFor(() => {
      expect(cardAfter.textContent).toContain('3s')
    })

    // already on real timers
  }, 10000)

  it('opens/closes Rules and Stats modals and toggles Hard Mode', async () => {
    const { default: App } = await import('../App')
    render(<App />)

    // Toggle Hard Mode button should flip aria-pressed
    // Accessible name comes from aria-label ("Sunku įjungta/išjungta"), not visible text
    const hardBtn = screen.getByRole('button', { name: /Sunku/i })
    expect(hardBtn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(hardBtn)
    expect(hardBtn).toHaveAttribute('aria-pressed', 'true')

    // Open Rules modal
    fireEvent.click(screen.getByRole('button', { name: '📜 Taisyklės' }))
    const rulesDlg = await screen.findByRole('dialog')
    expect(rulesDlg).toBeInTheDocument()
    // Close via Escape
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Open Stats modal and close via overlay click
    fireEvent.click(screen.getByRole('button', { name: '📊 Statistika' }))
    const statsDlg = await screen.findByRole('dialog')
    expect(statsDlg).toBeInTheDocument()
    fireEvent.click(statsDlg)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('shows loss message after 6 attempts', async () => {
    vi.resetModules()
    localStorage.clear()
    // Always validate ok and never win
    vi.doMock('../domain/logic', async (orig) => {
      const mod = await orig<any>()
      return {
        ...mod,
        validateGuess: () => ({ ok: true } as const),
        scoreGuess: (guessRaw: string) => {
          const letters = Array.from({ length: 5 }, (_, i) => ({ char: guessRaw[i] ?? '', state: 'absent' }))
          return { letters }
        },
        isWin: () => false,
      }
    })
    // Deterministic target
    vi.doMock('../storage', async (orig) => {
      const mod = await orig<any>()
      return { ...mod, getTodayTarget: () => 'bbbbb' }
    })
    // No confetti
    vi.doMock('../components/Confetti', () => ({ Confetti: () => null, __esModule: true }))
    const { default: App } = await import('../App')
    render(<App />)

    // Type 5 letters and submit 6 times
    const typeWord = () => {
      for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'a' }))
      fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    }
    for (let i = 0; i < 6; i++) typeWord()

    const toast = await screen.findByRole('status')
    expect(toast.textContent).toMatch(/Teisingas žodis:/)
  })

  it('copies share text to clipboard on win', async () => {
    vi.resetModules()
    localStorage.clear()
    // Mock a win path like previous test
    vi.doMock('../storage', async (orig) => {
      const mod = await orig<any>()
      return { ...mod, getTodayTarget: () => 'aaaaa' }
    })
    vi.doMock('../components/Confetti', () => ({ Confetti: () => null, __esModule: true }))
    vi.doMock('../domain/logic', async (orig) => {
      const mod = await orig<any>()
      return {
        ...mod,
        validateGuess: () => ({ ok: true } as const),
        scoreGuess: (guessRaw: string, targetRaw: string) => {
          const letters = Array.from({ length: 5 }, (_, i) => {
            const g = guessRaw[i] ?? ''
            const t = targetRaw[i] ?? ''
            return { char: g, state: g === t ? 'correct' : 'absent' }
          })
          return { letters }
        },
        isWin: (ar: any) => ar.letters.every((l: any) => l.state === 'correct'),
      }
    })
    const { default: App } = await import('../App')

    // Stub clipboard
    const writeText = vi.fn().mockResolvedValue(void 0)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<App />)
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'a' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))

    // Share button should appear and copy
    const shareBtn = await screen.findByRole('button', { name: 'Kopijuoti rezultatą' })
    fireEvent.click(shareBtn)
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    const toast = await screen.findByRole('status')
    expect(toast.textContent).toContain('Rezultatas nukopijuotas')
  })

  it('calls navigator.vibrate on validation error when available', async () => {
    // Ensure clean state so App mounts in 'playing' with empty current
    vi.resetModules()
    localStorage.clear()
    // Force validateGuess to return an error regardless of input
    vi.doMock('../domain/logic', async (orig) => {
      const mod = await orig<any>()
      return { ...mod, validateGuess: () => ({ error: 'err' } as const) }
    })
    vi.doMock('../storage', async (orig) => {
      const mod = await orig<any>()
      const logic = await import('../domain/logic')
      return { ...mod, loadState: () => logic.emptyState() }
    })
    const { default: App } = await import('../App')
    // Provide vibrate API in a way that satisfies `'vibrate' in navigator`
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vibrate,
    })
    render(<App />)
    // Trigger submit via on-screen Enter button (direct onClick to onKey)
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    // Vibrate should be attempted
    await waitFor(() => expect(vibrate).toHaveBeenCalled())
  })

  it('falls back to window.prompt when clipboard fails on share', async () => {
    vi.resetModules()
    localStorage.clear()
    // Win path mocks
    vi.doMock('../storage', async (orig) => {
      const mod = await orig<any>()
      return { ...mod, getTodayTarget: () => 'aaaaa' }
    })
    vi.doMock('../components/Confetti', () => ({ Confetti: () => null, __esModule: true }))
    vi.doMock('../domain/logic', async (orig) => {
      const mod = await orig<any>()
      return {
        ...mod,
        validateGuess: () => ({ ok: true } as const),
        scoreGuess: (guessRaw: string, targetRaw: string) => {
          const letters = Array.from({ length: 5 }, (_, i) => {
            const g = guessRaw[i] ?? ''
            const t = targetRaw[i] ?? ''
            return { char: g, state: g === t ? 'correct' : 'absent' }
          })
          return { letters }
        },
        isWin: (ar: any) => ar.letters.every((l: any) => l.state === 'correct'),
      }
    })
    const { default: App } = await import('../App')

    // Force clipboard failure
    const writeText = vi.fn().mockRejectedValue(new Error('no-clipboard'))
    Object.assign(navigator, { clipboard: { writeText } })
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('ok')

    render(<App />)
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'a' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))

    const shareBtn = await screen.findByRole('button', { name: 'Kopijuoti rezultatą' })
    fireEvent.click(shareBtn)

    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(promptSpy).toHaveBeenCalled()
    const toast = await screen.findByRole('status')
    expect(toast.textContent).toContain('Rezultatas paruoštas kopijavimui')
  })
})
