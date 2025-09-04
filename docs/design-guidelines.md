# Wordle LT – UI dizaino gairės

Versija: 2025-09-04
Savininkas: Frontend komanda
Apimtis: Programos paviršius (lenta, antraštė, statistika, klaviatūra, modalai)

Šios gairės aprašo vizualinę kalbą ir sąveikos taisykles, kurios šiuo metu įgyvendintos kode, bei nustato gerąsias praktikas tolimesniems darbams.

## Dizaino principai

- Nuoseklu, minimalu, įskaitoma. Prioritetas – aiškumas, kontrastas ir ritmiškumas.
- „Mobile‑first“. Patogus mastelis iki siaurų langų (≤420px) be horizontalaus slinkimo.
- Subtili animacija. Trumpi, tikslingi perėjimai; gerbti `prefers-reduced-motion`.
- Prieinama pagal nutylėjimą. Išlaikyti pakankamą kontrastą, semantinę struktūrą ir ARIA užuominas.
- Žaidimo mechanikos aiškumas: tikslinis žodis kiekvienam naujam žaidimui parenkamas atsitiktinai; laiko spaudimo UI (atgalinis laikmatis) rodomas tik Sunkiame režime.

## Temos

- Tik tamsus režimas (root: `color-scheme: dark`).
- Programos fonas – keli radialiniai gradientai virš `#0b1016`, suteikiantys gylio be triukšmo (žr. `src/index.css:body`).
- Programos paviršius (kortelė) – permatomas tamsus stiklas:
  - Fonas: `rgba(17,24,39,0.75)` (gray-900/75)
  - Kraštinė: `#1f2937` (gray-800)
  - Kampų užapvalinimas: `16px`
  - Šešėlis: `0 10px 30px rgba(0,0,0,0.4)`
  - Paraštės (padding): `16px`

## Spalvų žymės (tokens)

Grįžtamasis ryšys (Wordle semantika):
- Teisinga: `.bg-correct` + `.border-correct` = žalia
- Yra: `.bg-present` + `.border-present` = `#c9b458`
- Nėra: `.bg-absent` + `.border-absent` = `#787c7e`

Paviršiai ir tekstas:
- Plytelės kraštinė: `#374151` (gray-700)
- Statistikos „chip“: fonas `#111827` (gray-900), kraštinė `#374151` (gray-700)
- Klaviatūros numatyta: `#6b7280` (gray-500), užvedus `#9ca3af` (gray-400), paspaudus `#4b5563` (gray-600)

Neutraliems tonams teikite pirmenybę Tailwind utilitarams; žaidimo semantinėms spalvoms naudokite aukščiau pateiktas CSS klases.

## Tipografija

- Plytelės: pusjuodis, didžiosios, 1.5rem desktop; mažuose ekranuose skalė iki `6vw`.
- Bendras UI: laikytis Tailwind teksto skalės; antraštės ~2xl–lg; tekstas ~base.
- Naudoti `tabular-nums` vietose, kur reikia sulygiuotų skaičių (pvz., statistikoje).

## Tarpai ir išdėstymas

- Lenta: eilutės centruotos ir pritaikytos pagal turinį. Dabartinis ritmas:
  - Eilutės vertikalus tarpas: `gap-y-3` lentos tinklelyje.
  - Plytelės horizontalus tarpas: `gap-4` kiekvienoje eilutėje.
  - Eilutės horizontalios paraštės: `px-2`, kad kraštinių tarpai sutaptų su plytelių tarpais.
  - Lentos vertikalios paraštės: `py-3`, kad būtų „kvėpavimo“ aplink tinkleli.
- Antraštė: `flex items-center justify-between` su `gap-1` tarp pavadinimo ir veiksmų.
- Apatinė juosta naudoja saugios zonos įtraukas: `pb-[calc(0.5rem+env(safe-area-inset-bottom))]`.

Taisyklės:
- Naudokite Tailwind `gap-*` visiems grid/flex tarpams; venkite ad‑hoc „margin“, jei nebūtina.
- Išorines paraštes laikykite 2–4px žingsniais (Tailwind skalė), kad išlaikytumėte ritmą.

## Komponentai

### Plytelė (`.tile`)
- Fiksuotas kvadratas desktop: `3.25rem`.
- Mobiliai (≤420px): `13.5vw` kvadratas; šrifto dydis `6vw`.
- Kraštinė: `1px` gray-700; vidinės paraštės `2px`, kad raidės optiškai centruotųsi.
- Raidę centruoti per flexbox.
- Būsenų klasės taiko foną + kraštinę + teksto spalvą.

### Vardo įvedimo modalis (`WinNameModal`)
- Rodyti po pergalės – žaidėjo vardui lyderių lentelei įrašyti.
- Įvesties laukas ribotas iki 20 simbolių su validacija.
- Pateikimo mygtukas išsaugo įrašą lyderių lentelėje ir uždaro modalą.
- Praleisti – leidžia neįvesti vardo.
- Stilius nuoseklus su kitais žaidimo modalais.

### Klaviatūros mygtukas (`.key-btn`, `.keyboard-button`)
- Bazinės paraštės `0.5rem 0.75rem`, `4px` užapvalinimas.
- Subtili kraštinė ir vidinis šešėlis gylio pojūčiui.
- Mikro animacijos:
  - Perėjimai transformacijai ir fonui.
  - Paspaudus mastelis `0.96`.
  - „Ripple“ efektas per `::after` + `key-ripple` animaciją.
- Dydžių variantai: `.key-wide`, `.key-small` (+ mažesnis šriftas mobiliuose).

### Statistikos ženkleliai (`.stat-badge`)
- `inline-flex`, „pill“ kampai, kompaktiškos paraštės `0.375rem 0.625rem` su `gap-2`.
- Naudoti `stat-label` (prislopintas), `stat-value` (pabrėžtas) ir pasirenkamas `stat-ico`.

### Modalai
- Overlay „įsklandimas“ (`overlay-in`) ir kortelės įėjimas (`card-in`); uždarant – atvirkščiai.
- Kortelės transformacijos kilmė: centras; trumpas „easing“ (180–200ms).
- Lyderių lentelės skiltis (StatsModal) rodo top‑10 įrašų su rūšiavimu pagal Sunkų režimą, bandymus, laiką ir datą.
- Visi modalai palaiko uždarymą su Escape ir paspaudimu ant uždengimo (overlay).

## Judesys ir sąveikos

- Plytelės apvertimas (`flip-in`) po pateikimo su CSS „stagger“ pagal nth-child (0/110/220/330/440ms).
- Pasirenkamas pergalės pulsas (`pulse-win`) ant teisingų plytelių laimėjus.
- Dabartinės įvesties „pop“ (`pop-in`) rašant.
- Eilutės „shake“ neteisingai įvedčiai.
- Gerbti sumažinto judesio režimą:
  - Esant `prefers-reduced-motion: reduce`, stipriai trumpinti arba išjungti animacijas.

### Sunkiojo režimo laikmačio UX

- Matomumas: atgalinio laikmačio ženklelis rodomas tik kai Sunkus režimas įjungtas. Išjungus – ženklelis nerenderinamas.
- Startas: laikmatis startuoja su pirmu įvesties klavišo paspaudimu (ne atidarius programą). Jis perset’inamas pateikus bandymą arba pradėjus naują įrašą.
- Pabaiga: laikui pasibaigus, esamas bandymas prarandamas ir sunaudojamas vienas bandymas; rodyti aiškų pranešimą (toast) ir trumpą `shake`.
- Perjungimas: išjungus Sunkų režimą, ženklelis nedelsiant paslepiamas ir išvalomas bet koks terminas. Įjungus – laikmatis savaime nestartuos iki kito klavišo paspaudimo.
- A11y: atnaujinimai turi būti trumpi ir skelbiami per `aria-live="polite"`; ne per dažni (ne dažniau kaip kartą per sekundę). Spalva neturi būti vienintelis indikatorius – pridėkite ikoną ar etiketę.

## Charts and Utilities

- Histogramos juostos (`StatsModal`) plotį nustato per `inline-size: <percent>%` „inline“ stilių – taip testai tampa deterministiniai, o perėjimai sklandūs. Testuose plotis tikrinamas pagal „inline“ stilių.
- Augimo animacija naudoja `.bar-grow` perėjimą `inline-size` savybei.
- Pagalbinės klasės `.w-pct-6`…`.w-pct-100` yra faile `src/index.css`, tačiau `StatsModal` jų šiuo metu nenaudoja, kad testai būtų paprastesni.

## Prisitaikymas

- Kritinis lūžis ties 420px:
  - Plytelės pereina į `vw` matmenis, kad 5 plytelės + tarpai saugiai tilptų.
  - Klaviatūros mygtukai šiek tiek sumažinami.
- Išdėstymo konteineriai centruoja turinį (`mx-auto`) ir vengia stulpelių tempimo lentoje.

## Prieinamumas

- Užtikrinti, kad tekstų kontrastas spalvotose plytelėse atitiktų WCAG AA.
- Naudoti `aria-live="polite"` žaidimo pranešimams/toast'ams.
- Naudoti `aria-pressed` perjungikliams (pvz., Sunkus režimas) ir aprašomuosius `title`/`aria-label`.
- Fokusavimo kontūrai turi likti matomi; neišjungti jų be adekvataus pakaitalo.

## Lokalizavimas (i18n)

- Visi naudotojui matomi tekstai yra komponentuose; laikyti trumpus ir vengti fiksuotų pločių.
- `whitespace-nowrap` naudoti saikingai ir tik kur būtina (pvz., mygtukai su ikonų+etiketėmis), kad lietuvių kalboje nekiltų eilučių laužymo problemų.

## Našumas

- Vengti „layout thrashing“ animacijose; teikti pirmenybę transformacijos/opacity perėjimams.
- Plytelių apvertimams naudoti tik CSS „stagger“; vengti JS laikmačių per plytelę.
- „Backdrop“ filtrus ir ryškius šešėlius riboti mažiems paviršiams (pvz., programos kortelei, apatinei juostai).

## Tailwind naudojimo standartai

- Tarpams, išdėstymui ir neutralioms spalvoms pirmenybė Tailwind utilitarams.
- Žaidimo logikos būsenoms naudoti semantines CSS klases (`bg-correct`, `bg-present`, `bg-absent`).
- Savavališkas reikšmes naudoti tik kai reikia (pvz., „safe-area“ skaičiavimui): `pb-[calc(0.5rem+env(safe-area-inset-bottom))]`.
- Išdėstymui/dydžiui nenaudoti inline stilių; prireikus plėsti utilitarus `@layer utilities` sluoksnyje.

## Darykite ir nedarykite

- Darykite: išlaikykite nuoseklią tarpų skalę tarp komponentų.
- Darykite: centralizuokite pasikartojančius raštus (pvz., histogramos pločio utilitarai).
- Nedarykite: nekietai koduokite pikselių pločių komponentuose, jei egzistuoja utilitaras.
- Nedarykite: neanimuokite savybių, kurios sukelia perkomponavimą (naudokite `transform`).

## Pakeitimų gairės

- Keičiant tarpų skales, atnaujinkite ir lentos konteinerį, ir eilučių tarpus, kad išlaikytumėte simetriją.
- Derinant plytelių dydžius, patikrinkite, kad mobiliųjų lūžis išliktų be išsiliejimo (overflow).
- Pridedant naujas grįžtamojo ryšio būsenas, apibrėžkite tiek fono, tiek kraštinių „tokens“.

## Įgyvendinimo nuorodos

- Stiliai: `src/index.css`
- Lenta: `src/components/Board.tsx`
- Programos „apvalkalas“: `src/App.tsx`
- Statistika/Modalai: `src/components/StatsModal.tsx`, `src/components/RulesModal.tsx`, `src/components/WinNameModal.tsx`

---

Jei pridedate naujų komponentų, čia įrašykite trumpą aprašą apie tarpus, spalvas, būsenas ir judesį. Laikykite šį failą vieninteliu UI sprendimų tiesos šaltiniu.
