import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll } from 'vitest'

// rAF mock for components that animate numbers or rely on it
if (!('requestAnimationFrame' in globalThis)) {
  // @ts-ignore
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now() + 16), 16) as unknown as number
  // @ts-ignore
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id as unknown as NodeJS.Timeout)
}

// Canvas mock to prevent jsdom errors when components attempt to use it
// @ts-ignore
if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
  // @ts-ignore
  HTMLCanvasElement.prototype.getContext = function getContext() { return {} as any }
}

// Suppress noisy React 19 dev internal error while keeping other errors visible
const originalConsoleError = console.error
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation((...args: any[]) => {
    const msg = String(args[0] ?? '')
    if (msg.includes('Expected static flag was missing')) return
    // @ts-ignore
    originalConsoleError.apply(console, args)
  })
})

afterAll(() => {
  ;(console.error as any).mockRestore?.()
})
