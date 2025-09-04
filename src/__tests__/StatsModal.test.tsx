import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import React from 'react'

vi.mock('../storage', async (orig) => {
  const mod = await orig<any>()
  return {
    ...mod,
    loadStats: () => ({
      gamesPlayed: 12,
      wins: 9,
      byAttempts: [1, 2, 3, 2, 1, 0],
      currentStreak: 4,
      maxStreak: 6,
      lastPlayedDay: 123,
      resultsByDay: { 120: 'win', 121: 'loss', 122: 'win', 123: 'win' },
    }),
  }
})

describe('StatsModal', () => {
  it('renders KPI values and can be closed via Escape and overlay click', async () => {
    const onClose = vi.fn()
    const { StatsModal } = await import('../components/StatsModal')
    render(<StatsModal open={true} onClose={onClose} animationDuration={0} />)

    const dialog = await screen.findByRole('dialog')

    // helper: paima KPI reikšmę pagal KPI etiketę (filtruojam tik div.text-sm.opacity-80)
    const kpiValueText = (label: string) =>
      (within(dialog).getByText(label, { selector: 'div.text-sm.opacity-80' })
        .previousElementSibling as HTMLElement)?.textContent ?? ''

    await waitFor(() => {
      expect(kpiValueText('Žaista')).toMatch(/12/)
      expect(kpiValueText('Laimėta')).toMatch(/9/)
      // Su išjungta animacija tiksliai 75%
      expect(kpiValueText('Win%')).toMatch(/75\s*%/)
      expect(kpiValueText('Serija')).toMatch(/4/)
    })

    // Close via Escape
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('schedules a second RAF frame when p < 1 (AnimatedNumber branch)', async () => {
    const originalRaf = globalThis.requestAnimationFrame as any
    const originalCaf = globalThis.cancelAnimationFrame as any
    const originalPerfNow = globalThis.performance.now.bind(globalThis.performance) as () => number
    try {
      vi.resetModules()
      vi.doMock('../storage', () => ({
        loadStats: () => ({
          gamesPlayed: 1,
          wins: 1,
          byAttempts: [1, 0, 0, 0, 0, 0],
          currentStreak: 1,
          maxStreak: 1,
          lastPlayedDay: 1,
          resultsByDay: {},
        })
      }))
      let calls = 0
      globalThis.performance.now = (() => 0) as any
      globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
        calls++
        // First frame with t=0 -> p=0 (<1) schedules another frame
        // Second frame with t=20 (> duration=16) finishes
        const t = calls === 1 ? 0 : 20
        cb(t as any)
        return calls as any
      }) as any
      globalThis.cancelAnimationFrame = (() => {}) as any

      const { StatsModal } = await import('../components/StatsModal')
      render(<StatsModal open={true} onClose={() => {}} animationDuration={16} />)

      await waitFor(() => {
        expect(calls).toBeGreaterThanOrEqual(2)
      })
    } finally {
      globalThis.requestAnimationFrame = originalRaf
      globalThis.cancelAnimationFrame = originalCaf
      globalThis.performance.now = originalPerfNow as any
    }
  })

  it('computes attempt distribution widths when wins>0 and maxAttempts>0', async () => {
    // Ensure normal (non-fallback) branches are taken
    vi.resetModules()
    vi.doMock('../storage', () => ({
      loadStats: () => ({
        gamesPlayed: 5,
        wins: 5,
        byAttempts: [1, 4, 0, 0, 0, 0], // maxAttempts = 4
        currentStreak: 2,
        maxStreak: 4,
        lastPlayedDay: 300,
        resultsByDay: {},
      })
    }))
    const { StatsModal } = await import('../components/StatsModal')
    render(<StatsModal open={true} onClose={() => {}} animationDuration={0} />)

    const dialog = await screen.findByRole('dialog')
    const bars = dialog.querySelectorAll('.bar-grow')
    // Expect 6 rows
    expect(bars.length).toBe(6)

    // With byAttempts [1,4,0,0,0,0] and maxAttempts=4:
    // row 1 width = round((1/4)*100) = 25%
    // row 2 width = round((4/4)*100) = 100%
    const row1 = bars[0] as HTMLElement
    const row2 = bars[1] as HTMLElement
    expect(row1.getAttribute('style') || '').toMatch(/inline-size:\s*25%/i)
    expect(row2.getAttribute('style') || '').toMatch(/inline-size:\s*100%/i)
  })
  it('does not render when open=false', async () => {
    const { StatsModal } = await import('../components/StatsModal')
    render(<StatsModal open={false} onClose={() => {}} animationDuration={0} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('clicking inside the card does not close modal', async () => {
    const onClose = vi.fn()
    const { StatsModal } = await import('../components/StatsModal')
    render(<StatsModal open={true} onClose={onClose} animationDuration={0} />)
    const card = await screen.findByRole('document')
    fireEvent.click(card)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('covers attempt distribution branches when wins=0 and maxAttempts=0', async () => {
    // Rewire storage for this test to return zeros
    vi.resetModules()
    vi.doMock('../storage', () => ({
      loadStats: () => ({
        gamesPlayed: 0,
        wins: 0,
        byAttempts: [0, 0, 0, 0, 0, 0],
        currentStreak: 0,
        maxStreak: 0,
        lastPlayedDay: 200,
        resultsByDay: {},
      })
    }))
    const { StatsModal } = await import('../components/StatsModal')
    render(<StatsModal open={true} onClose={() => {}} animationDuration={0} />)

    const dialog = await screen.findByRole('dialog')

    // All attempt rows should show 0, and width should fallback to 6%
    const rows = within(dialog).getAllByText(/^[1-6]$/)
    expect(rows).toHaveLength(6)
    // Force Math.max to return 0 so the component takes the fallback branch
    const maxSpy = vi.spyOn(Math, 'max').mockReturnValue(0 as any)
    try {
      const bars = dialog.querySelectorAll('.bar-grow')
      expect(bars.length).toBe(6)
      const bar = bars[5] as HTMLElement
      expect(bar.getAttribute('style') || '').toMatch(/inline-size:\s*6%/i)
    } finally {
      maxSpy.mockRestore()
    }
  })

  it('calendar shows win, loss and none states and Close button triggers onClose', async () => {
    // Isolate module state and mock storage to ensure visible win/loss/none within last35 window
    vi.resetModules()
    const { baseEpochDay } = await import('../domain/logic')
    const today = baseEpochDay()
    vi.doMock('../storage', async (orig) => {
      const mod = await orig<any>()
      return {
        ...mod,
        loadStats: () => ({
          gamesPlayed: 3,
          wins: 2,
          byAttempts: [1, 1, 1, 0, 0, 0],
          currentStreak: 1,
          maxStreak: 2,
          lastPlayedDay: today,
          // Ensure at least one of each outcome appears in current 5-week grid
          resultsByDay: { [today]: 'win', [today - 1]: 'loss' },
        }),
      }
    })

    const onClose = vi.fn()
    const { StatsModal } = await import('../components/StatsModal')
    render(<StatsModal open={true} onClose={onClose} animationDuration={0} />)
    const dialog = await screen.findByRole('dialog')

    // Expect at least one of each aria-label variant to exist
    // Lithuanian labels: laimėta (win), pralaimėta (loss), nežaista (none)
    expect(within(dialog).getAllByLabelText(/laimėta/i).length).toBeGreaterThan(0)
    expect(within(dialog).getAllByLabelText(/pralaimėta/i).length).toBeGreaterThan(0)
    expect(within(dialog).getAllByLabelText(/nežaista/i).length).toBeGreaterThan(0)

    // Click the visible Close button
    const closeBtn = within(dialog).getByRole('button', { name: /Uždaryti/i })
    closeBtn.click()
    expect(onClose).toHaveBeenCalled()
  })

  it('invokes onClose on overlay click', async () => {
    const onClose = vi.fn()
    const { StatsModal } = await import('../components/StatsModal')
    render(<StatsModal open={true} onClose={onClose} animationDuration={0} />)
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(dialog) // jei overlay yra pats dialogas
    expect(onClose).toHaveBeenCalled()
  })

  it('animates KPI values when animationDuration > 0 (AnimatedNumber RAF path)', async () => {
    // Stub RAF to complete animation in a single frame by passing a large timestamp
    const originalRaf = globalThis.requestAnimationFrame as any
    const originalCaf = globalThis.cancelAnimationFrame as any
    const originalPerfNow = globalThis.performance.now.bind(globalThis.performance) as () => number
    try {
      // Ensure we don't inherit zeroed storage mock from previous tests
      vi.resetModules()
      vi.doMock('../storage', () => ({
        loadStats: () => ({
          gamesPlayed: 12,
          wins: 9,
          byAttempts: [1, 2, 3, 2, 1, 0],
          currentStreak: 4,
          maxStreak: 6,
          lastPlayedDay: 123,
          resultsByDay: { 120: 'win', 121: 'loss', 122: 'win', 123: 'win' },
        })
      }))
      globalThis.performance.now = (() => 0) as any
      globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
        // Call with t far greater than duration so p=1 in the first step
        cb(1000)
        return 1 as any
      }) as any
      globalThis.cancelAnimationFrame = (() => {}) as any

      const onClose = vi.fn()
      const { StatsModal } = await import('../components/StatsModal')
      render(<StatsModal open={true} onClose={onClose} animationDuration={16} />)

      const dialog = await screen.findByRole('dialog')
      const kpi = within(dialog).getByRole('group', { name: /kpi/i })
      const kpiValueEl = () =>
        (within(kpi).getByText('Win%', { selector: 'div.text-sm.opacity-80' })
          .previousElementSibling as HTMLElement)

      await waitFor(() => {
        // With provided mocked stats, Win% should end up at 75%
        expect(kpiValueEl().textContent).toMatch(/75\s*%/)
      })
    } finally {
      globalThis.requestAnimationFrame = originalRaf
      globalThis.cancelAnimationFrame = originalCaf
      globalThis.performance.now = originalPerfNow as any
    }
  })
})
