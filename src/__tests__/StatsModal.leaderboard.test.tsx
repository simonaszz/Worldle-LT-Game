import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { StatsModal } from '../components/StatsModal'

// In-memory localStorage mock (consistent with other storage tests)
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

beforeEach(() => {
  localStorage.clear()
})

describe('StatsModal leaderboard section', () => {
  it('shows empty message when no entries', () => {
    render(<StatsModal open={true} onClose={() => {}} />)
    expect(screen.getByText(/Kol kas įrašų nėra/i)).toBeInTheDocument()
  })

  it('renders a table with top entries', () => {
    const entries = [
      { name: 'HardTop', epochDay: 1, attempts: 3, timeMs: 9000, hardMode: true, dateISO: '2025-01-02T00:00:00.000Z' },
      { name: 'NormTwo', epochDay: 2, attempts: 2, timeMs: 15000, hardMode: false, dateISO: '2025-01-03T00:00:00.000Z' },
      { name: 'NormSlow', epochDay: 3, attempts: 3, timeMs: 30000, hardMode: false, dateISO: '2025-01-01T00:00:00.000Z' },
    ]
    localStorage.setItem(LEADER_KEY, JSON.stringify(entries))

    render(<StatsModal open={true} onClose={() => {}} />)

    const table = screen.getByRole('table', { name: /Lyderių lentelė/i })
    const rows = within(table).getAllByRole('row')
    // 1 header + 3 data rows
    expect(rows.length).toBe(4)

    // First data row should be HardTop (sorted first)
    const row1 = rows[1]
    expect(within(row1).getByText('HardTop')).toBeInTheDocument()
    expect(within(row1).getByText('3')).toBeInTheDocument()
    expect(within(row1).getByText('9s')).toBeInTheDocument()
    expect(within(row1).getByText('Hard')).toBeInTheDocument()
  })
})
