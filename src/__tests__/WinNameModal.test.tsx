import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WinNameModal } from '../components/WinNameModal'

describe('WinNameModal', () => {
  it('does not render when closed', () => {
    const { container } = render(<WinNameModal open={false} onClose={() => {}} onSubmit={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders when open and shows default name; submits name', () => {
    const onSubmit = vi.fn()
    render(<WinNameModal open={true} onClose={() => {}} onSubmit={onSubmit} defaultName="Simona" />)

    const input = screen.getByLabelText('Žaidėjo vardas') as HTMLInputElement
    expect(input.value).toBe('Simona')

    fireEvent.change(input, { target: { value: ' Jonas ' } })
    const saveBtn = screen.getByRole('button', { name: 'Išsaugoti' })
    fireEvent.click(saveBtn)

    expect(onSubmit).toHaveBeenCalledWith('Jonas')
  })

  it('closes on cancel and on Escape', () => {
    const onClose = vi.fn()
    render(<WinNameModal open={true} onClose={onClose} onSubmit={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Atšaukti' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    // re-render to open again
    onClose.mockClear()
    render(<WinNameModal open={true} onClose={onClose} onSubmit={() => {}} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
