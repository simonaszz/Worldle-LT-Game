import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RulesModal } from '../components/RulesModal'

describe('RulesModal', () => {
  it('does not render when open=false', () => {
    const onClose = vi.fn()
    const { container } = render(<RulesModal open={false} onClose={onClose} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders content when open', () => {
    const onClose = vi.fn()
    render(<RulesModal open={true} onClose={onClose} />)
    expect(screen.getByRole('dialog', { hidden: false })).toBeInTheDocument()
    expect(screen.getByText('Kaip žaisti')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Uždaryti' })).toBeInTheDocument()
  })

  it('closes on Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<RulesModal open={true} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on overlay click', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<RulesModal open={true} onClose={onClose} />)
    const overlay = screen.getByRole('dialog')
    await user.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on button click', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<RulesModal open={true} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Uždaryti' }))
    expect(onClose).toHaveBeenCalled()
  })
})
