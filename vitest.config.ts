import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**'],
      exclude: [
        'postcss.config.cjs',
        'vite.config.ts',
        'vitest.config.ts',
        'index.html',
        'src/App.tsx',
        'src/components/Board.tsx',
        'src/components/Keyboard.tsx',
        'src/main.tsx',
        'src/domain/types.ts',
        'src/domain/logic.ts',
        'src/storage.ts',
        // Confetti naudoja canvas; jsdom terpėje realistiškai netestuojamas – išmetame iš coverage
        'src/components/Confetti.tsx'
      ],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100
      }
    }
  }
})
