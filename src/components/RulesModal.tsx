import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded p-4 max-w-lg w-full">
        <h2 className="text-xl font-bold mb-2">Kaip žaisti</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Įvesk <strong>5 raidžių</strong> žodį ir paspausk <strong>Enter</strong>.</li>
          <li>Turi iki <strong>6 bandymų</strong> atspėti dienos žodį.</li>
          <li>Po kiekvieno bandymo plytelės nusidažo – tai užuominos kitam bandymui.</li>
        </ol>

        <h3 className="text-lg font-semibold mt-4 mb-1">Spalvų reikšmės</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="legend-box bg-correct border-correct" aria-hidden />
            <span><strong>Žalia</strong> – teisinga raidė teisingoje vietoje.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="legend-box bg-present border-present" aria-hidden />
            <span><strong>Geltona</strong> – raidė yra žodyje, bet kitoje vietoje.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="legend-box bg-absent border-absent" aria-hidden />
            <span><strong>Pilka</strong> – tokios raidės žodyje nėra.</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-4 mb-1">Taisyklės</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Leidžiami tik žodžiai iš žodyno sąrašo. Jei žodžio nėra – bandymas <em>nepriimamas</em>.</li>
          <li>Leidžiamos LT raidės su diakritikomis: <strong>a–z ą č ę ė į š ų ū ž</strong>. Įvestis saugoma <em>nekeičiant</em> diakritikų.</li>
          <li>Pasikartojančios raidės: jei žodyje ta raidė yra tik <em>kartą</em>, tik viena plytelė nusidažys (pagal vietą), likusios bus pilkos.</li>
          <li>Ekraninė klaviatūra irgi rodo užuominas: žalia/pilka/geltona pagal tavo bandymus.</li>
          <li>Kiekvieną dieną – <strong>naujas žodis</strong> visiems žaidėjams.</li>
          <li><strong>Hard Mode</strong> (⚡ Sunku): turi naudoti visas anksčiau atskleistas užuominas (žalios pozicijos fiksuotos, geltonos – privalomos).</li>
        </ul>

        <h3 className="text-lg font-semibold mt-4 mb-1">Patarimai</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Pradėk nuo žodžių su dažnomis raidėmis (pvz., turinčių balses).</li>
          <li>Naudok gautas užuominas – koreguok raidžių vietas ir bandyk naujas.</li>
        </ul>
        <div className="mt-4 flex justify-end gap-2">
          <button className="keyboard-button" onClick={onClose}>Uždaryti</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
