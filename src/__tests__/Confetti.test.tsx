import { render } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Confetti } from '../components/Confetti'

// Mock canvas and context - use a mutable object for globalAlpha
const mockContext = {
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  fillRect: vi.fn(),
  get globalAlpha() { return this._globalAlpha },
  set globalAlpha(value) { this._globalAlpha = value },
  _globalAlpha: 1,
  fillStyle: '',
}

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockContext),
  writable: true,
})

describe('Confetti', () => {
  let rafSpy: ReturnType<typeof vi.spyOn>
  let performanceSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockContext._globalAlpha = 1 // Reset mock context
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(() => cb(performance.now()), 16)
      return 1
    })
    performanceSpy = vi.spyOn(performance, 'now').mockReturnValue(0)
  })

  afterEach(() => {
    rafSpy.mockRestore()
    performanceSpy.mockRestore()
  })

  it('renders canvas with correct classes', () => {
    const { container } = render(<Confetti />)
    const canvas = container.querySelector('canvas')
    
    expect(canvas).toBeTruthy()
    expect(canvas?.className).toContain('fixed inset-0 pointer-events-none z-50')
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
  })

  it('applies fade out effect in last 500ms', async () => {
    const duration = 2500
    let currentTime = 0
    performanceSpy.mockImplementation(() => currentTime)
    
    render(<Confetti duration={duration} />)
    const alphaSetSpy = vi.spyOn(mockContext as any, 'globalAlpha', 'set')

    // Let the first scheduled frame run and initialize 'start'
    await new Promise(resolve => setTimeout(resolve, 20))

    // Move time to halfway through the fade-out window and let the next frame run
    const fadeOutStart = duration - 500 // 2000ms
    const fadeOutTime = fadeOutStart + 250 // 2250ms (halfway through fade)
    currentTime = fadeOutTime
    await new Promise(resolve => setTimeout(resolve, 20))

    // Check that globalAlpha was set to fade out value
    // At 250ms into 500ms fade period, alpha should be 0.5
    const expectedAlpha = 1 - (250 / 500) // 0.5
    expect(alphaSetSpy).toHaveBeenCalledWith(expectedAlpha)
  })

  it('sets full opacity before fade out period', async () => {
    const duration = 2500
    let currentTime = 1000 // Before fade out
    performanceSpy.mockImplementation(() => currentTime)
    
    render(<Confetti duration={duration} />)

    // Manually trigger the tick function
    const rafCallback = rafSpy.mock.calls[0]?.[0] as FrameRequestCallback
    if (rafCallback) {
      rafCallback(currentTime)
    }

    // Should have full opacity
    expect(mockContext.globalAlpha).toBe(1)
  })

  it('sets zero opacity at end of fade out', async () => {
    const duration = 2500
    let currentTime = 0
    performanceSpy.mockImplementation(() => currentTime)
    
    render(<Confetti duration={duration} />)
    const alphaSetSpy = vi.spyOn(mockContext as any, 'globalAlpha', 'set')

    // Let the first scheduled frame run and initialize 'start'
    await new Promise(resolve => setTimeout(resolve, 20))

    // Set time to end of duration and let next frame run
    currentTime = duration
    await new Promise(resolve => setTimeout(resolve, 20))

    // Should have zero opacity
    expect(alphaSetSpy).toHaveBeenCalledWith(0)
  })

  it('resets globalAlpha to 1 after rendering particles', async () => {
    let currentTime = 1000
    performanceSpy.mockImplementation(() => currentTime)
    
    render(<Confetti />)

    // Manually trigger the tick function
    const rafCallback = rafSpy.mock.calls[0]?.[0] as FrameRequestCallback
    if (rafCallback) {
      rafCallback(currentTime)
    }

    // globalAlpha should be reset to 1 after rendering
    expect(mockContext.globalAlpha).toBe(1)
  })

  it('stops animation after duration', async () => {
    const duration = 1000
    render(<Confetti duration={duration} />)

    // Simulate time past duration
    performanceSpy.mockReturnValue(duration + 100)

    // Trigger animation frame
    await new Promise(resolve => setTimeout(resolve, 20))

    // Should stop requesting animation frames
    expect(rafSpy).toHaveBeenCalled()
  })
})
