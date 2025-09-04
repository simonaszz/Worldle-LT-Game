import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function WinNameModal({
  open,
  onClose,
  onSubmit,
  defaultName = ''
}: {
  open: boolean
  onClose: () => void
  onSubmit: (name: string) => void
  defaultName?: string
}) {
  const [name, setName] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setName(defaultName)
      setTimeout(() => inputRef.current?.focus(), 0)
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [open, defaultName, onClose])

  if (!open) return null

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const n = name.trim()
    if (!n) return
    onSubmit(n)
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="win-name-title" className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
      <div className="relative z-[10000] bg-gray-800 text-gray-100 rounded p-4 max-w-sm w-full shadow-2xl shadow-black/40 modal-card" role="document" onClick={(e) => e.stopPropagation()}>
        <h2 id="win-name-title" className="text-xl font-bold mb-3">🎉 Sveikiname!
          <span className="block text-sm font-normal opacity-80">Įvesk savo vardą į lyderių lentelę</span>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm" htmlFor="player-name">Vardas</label>
          <input
            id="player-name"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 outline-none focus:ring-2 ring-green-400"
            placeholder="Pvz., Simona"
            maxLength={20}
            aria-label="Žaidėjo vardas"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="keyboard-button" onClick={onClose}>Atšaukti</button>
            <button type="submit" className="keyboard-button bg-green-600 hover:bg-green-500">Išsaugoti</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
