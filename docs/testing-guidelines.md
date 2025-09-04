# Testing Guidelines – Wordle LT

Version: 2025-09-04
Owner: Frontend Team
Scope: Unit, component, integration tests (Vitest + RTL), and guidance for future E2E.

These guidelines ensure stable, deterministic, and complete test coverage for core mechanics, including the random target selection and the per‑guess timer that applies only in Hard Mode.

## Technologijos

- Testų vykdyklė: Vitest
- Komponentų testavimas: React Testing Library (RTL)
- Paruošimas: `vitest.setup.ts` (RAF/canvas maketai, konsolės filtrai, a11y pagalbininkai)
- Padengimo slenksčiai: `vitest.config.ts` – eilutės/sakiniai/funkcijos 100%, šakos 95%

Vykdyti visus testus:
```bash
npm test
```

## Bendrieji principai

- Laikykite testus deterministinius. Aiškiai maketuokite nedeterminizmo šaltinius (laiką, atsitiktinumą, animacijas).
- Pirmenybę teikite testavimui per viešą UI/DOM būseną ir naudotojo sąveikas (RTL `userEvent`) vietoje vidinių įgyvendinimo detalių.
- Mažinkite priklausomybę nuo laikmačių naudodami `vi.useFakeTimers()` ir `vi.advanceTimersByTime()` skaičiuotuvams (countdown) simuliuoti.
- Darykite tikslias ir aprašomąsias patikras (assert). Venkite per plačių užklausų – ribokite pagal roles/etiketes.

## Maketai ir stub'ai

- `requestAnimationFrame` ir canvas yra „stubuojami“ faile `vitest.setup.ts`.
- Įdėkite stabilų vienkartinį stub'ą visam suito vykdymui `navigator.vibrate`:
```ts
Object.defineProperty(navigator, 'vibrate', { value: vi.fn(), configurable: true, writable: true })
```
- Nutildykite triukšmingą React 19 perspėjimą per tikslinį `console.error` „spy“ `setup` faile (neužtildykite visų klaidų).

- Konfeti testavimas: „canvas“ `2d` kontekstas yra maketuojamas; vietoje galutinės reikšmės skaitymo geriau stebėti `ctx.globalAlpha` „setter“ kvietimus (komponentas po kiekvieno kadro grąžina reikšmę į `1`). Animacijos laiką valdykite per `requestAnimationFrame` ir `performance.now` maketus.

## Laikas ir atsitiktinumas

- Data/laikas: naudokite `vi.setSystemTime(new Date('2025-01-01T09:00:00Z'))` arba nustatykite epochos laiką per `Date.now = vi.fn(() => fixedMs)` konkrečiuose testuose. Atstatykite `afterEach` bloke.
- Atgalinis laikmatis (countdown): naudokite netikrus laikmačius.
```ts
vi.useFakeTimers()
// Pirmas klavišo paspaudimas (pradeda laikmatį Sunkiame režime)
// ... tada
vi.advanceTimersByTime(20_000)
```
- Atsitiktinis tikslas: „mock“'inkite `Math.random`, kad gautumėte deterministinius indeksus testuojant `pickRandomTarget()` ar nuo jo priklausančius srautus.
```ts
const restore = Math.random
Math.random = vi.fn(() => 0.123) // maps to a known index
// ... patikros (assertions)
Math.random = restore
```

## Vienetų testai (domenas)

Target: `src/domain/logic.ts` and related utils.

- `normalizeInput` – išsaugo lietuviškas diakritikas, tvarko mažąsias/didžiąsias, pašalina tik neleidžiamus simbolius.
- `validateGuess` – ilgis, priklausymas leidžiamam žodynui, ne raidinių simbolių sulaikymas.
- `scoreGuess` – taisyklės teisinga/esančia/nesanti (įskaitant pasikartojančias raides).
- `isWin` – visos langelių būsenos teisingos.
- `pickRandomTarget` – parenka elementą ribose; stabilus, kai `Math.random` „mockintas“.
- `pickDailyTarget` – paliktas regresiniams testams ir istoriniam suderinamumui.

## Saugyklos ir būsenos testai

Target: `src/storage.ts` and App state integration.

- Išsaugojimo schemos versijavimas (`version`, `wordlistVersion`).
- Statistikų agregavimas: `gamesPlayed`, `wins`, seka (streaks), rezultatai pagal dieną.
- Perėjimo į kitą dieną elgsena per `baseEpochDay()`.
- Naujo žaidimo pradžia: užtikrinkite, kad naudojamas naujas atsitiktinis tikslas (mock `Math.random`).

## Komponentų testai (RTL)

- `Board.tsx` – atvaizduoja 6 eilutes × 5 plyteles; klasės keičiasi per flip/pop/shake.
- `Keyboard.tsx` – raidžių įvedimas, trynimas (backspace), patvirtinimas (enter); LT diakritikos buvimas ir priėmimas įvesties metu.
- `StatsModal.tsx` – KPI metrikos; histogramos juostų plotis tikrinamas per „inline“ `inline-size` stilių ant `.bar-grow`; mini kalendoriaus langavimas; uždarymas su Escape/per uždengimą; `role="group" aria-label="KPI"` semantika.
- `RulesModal.tsx` – matomumas, uždarymo sąveikos.

## Integraciniai testai – programos srautai

Target: `src/App.tsx`

- Laimėjimo scenarijus: įveskite 5 raides, pateikite, stebėkite „flip“ seką ir laimėjimo būseną; atsinaujina statistika; „Naujas žaidimas“ iš naujo parenka atsitiktinį tikslą (mockinta).
- Netinkamos įvestys: per trumpas žodis, nėra žodyne, ne raidė – pranešimai (toast) ir `shake` klasė.
- Sunkus režimas – validacija: privalo likti teisingos (žalios) pozicijos ir būti ankstesnės geltonos raidės. Rodyti tinkamus LT klaidų pranešimus.

## Laikmačio elgsena (tik Sunkus režimas)

- Matomumas: atgalinio laikmačio ženklelis rodomas tik kai `hardMode` yra `true`; kitu atveju – slepiamas.
- Startas su pirmu klavišo paspaudimu: įvedus pirmą simbolį, kai Sunkus režimas įjungtas, nustatomas `guessDeadline` pagal `guessTimeLimitMs`.
- Laiko pabaiga: suėjus laikui, esamas bandymas prarandamas, o bandymų skaičius sumažinamas; parodykite pranešimą (toast) ir trumpą `shake`.
- Išjungimas: perjungus Sunkų režimą į „išjungta“, `guessDeadline` išvalomas, ženklelis paslepiamas iškart.
- Įjungimas: įjungus Sunkų režimą laikmatis nesispėja automatiškai; jis startuos su kitu klavišo paspaudimu.

Pavyzdys (pseudo):
```ts
vi.useFakeTimers();
render(<App />);
// įjunkite Sunkų režimą
await user.click(screen.getByRole('button', { name: /hard/i }));
// įveskite pirmą raidę → startuoja laikmatis
await user.keyboard('a');
// prasukite laiką iki pabaigos
vi.advanceTimersByTime(20_000);
// patikrinkite: bandymas prarastas ir parodytas pranešimas
```

## Prieinamumas (a11y)

- `aria-live="polite"` pranešimams ir būsenų atnaujinimams (įsk. atgalinį laikmatį). Užtikrinkite, kad pranešimai nebūtų dažnesni nei 1 Hz.
- Išlaikykite fokusavimo kontūrus; modalų fokusavimo „gaudyklės“, `aria-modal`.
- Laikmačio ženklelyje ir klaviatūros klavišų būsenose pateikite ne tik spalvinius indikatorius (pvz., ikoną/etiketę).

## Animacijos ir determinizmas

- Naudokite CSS pagrįstą „stagger“ plytelių apvertimams; testuose tikrinkite klases ir, kai įmanoma, venkite laukimo pagal realų laiką.
- Kai animacijos trukmė valdoma per props (pvz., `StatsModal`), testuose perdokite `animationDuration={0}`, kad sumažintumėte nestabilumą.

- Konfeti: pradžios laikas inicijuojamas vieną kartą (null sargybinis), kadrus veskite per „mockintą“ RAF; blukimo (fade-out) alfa tikrinkite stebėdami `globalAlpha` „setter“ argumentą bėgant laikui; nepamirškite, kad komponentas po piešimo grąžina `globalAlpha` į `1`.

## E2E (ateityje – Playwright)

- Smoke: pergalė, pralaimėjimas, naujas žaidimas, išsaugojimas, perėjimas per vietinę vidurnakčio ribą.
- Mobilūs peržiūros langai, „safe-area“ įtraukos.
- Bendrinimo į iškarpinę srautas.

## Priežiūros sąrašas

- Pridedant funkcijų, susijusių su laiku ar atsitiktinumu, testuose įtraukite deterministinius maketus.
- Atnaujinkite ADR (`docs/ADR-001.md`), README ir Dizaino gaires, kai keičiasi UX/logika.
- Išlaikykite 100% padengimą eilutėms/sakiniams/funkcijoms ir ≥95% šakoms. Išimtis dokumentuokite inline, kai būtina. `src/components/Confetti.tsx` neįtraukiamas į padengimą dėl jsdom/canvas apribojimų; jo elgsena tikrinama per maketus ir tikslingus testus.
