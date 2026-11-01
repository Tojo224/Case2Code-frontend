# Feature: interactive-tutorial

Branch: `feat/interactive-tutorial` (from `main` @ d617f4e)
Engram mirror: `odd/interactive-tutorial/tasks` — PENDING (mem_save refused: ambiguous_project; no frontend project registered in Engram; resync when resolved)

## Objective
Guided, task-based onboarding tour for Case2Code (UML editor): spotlight overlay, contextual popover,
next / back / skip, real task flow, re-openable from a help entry. Spanish copy (voseo, as the UI).

## Problem / why
No help exists today. The app is a single page with a long real flow (login -> project -> class ->
relationship -> share -> AI -> Spring Boot). New users get lost.

## Decisions
- Library: `driver.js` (verified API: `waitForElement`, `advanceOnClick`, `popoverClass`, `onNextClick`).
- State: new `useTourStore` (zustand), persistence in `localStorage` key `case2code_tour_done`,
  same pattern as `useThemeStore`.
- Anchors: `data-tour="..."` attributes (no ids/testids exist today).
- Overlay z-index above modals (`z-50`): driver overlay must be > 50.
- Two modes: full onboarding tour (task based) + small contextual tips for advanced features (later task).

## Scope
In: `src/` of this frontend repo only. Out: backend, docs repo, i18n.

## Constraints discovered
- Navbar create-diagram modal, UserMenu dropdown and sidebar collapse are local `useState`
  (tour cannot control them) -> lift to stores where a step needs them.
- Sidebar starts collapsed under 1024px; Navbar labels hidden at breakpoints -> anchor on buttons.
- Canvas nodes/edges are dynamic -> steps wait on store state (`classes.length`, `editingRelationship`).
- Logged-out users only see AuthModal; tour starts after login + `currentDocument`.

## Config
- TDD: not configured for this project (vitest present but not enabled) -> OFF, source: default.
- Runner for checks: `npm run test` (vitest run) and `npm run build` (tsc -b && vite build).
- Delivery strategy: ask-on-risk. Forecast < 400 authored lines per slice target; revisit if exceeded.
- Planning heuristic only: ~400 changed lines per task.

## Tasks
- [x] T1 deps + `useTourStore` (start/stop/step/completed, localStorage) + vitest for the store
- [x] T2 tour steps definition + `TourController` component + dark-mode/z-index theming CSS
- [ ] T3 `data-tour` anchors on Navbar/Sidebar/Canvas/Modals; lift sidebar collapse state into a store
- [ ] T4 help entry (Navbar next to ThemeToggle) + auto-start for first-time users after login
- [ ] T5 contextual tips for advanced features (N:M junction table, XMI, Pair Dev)

## Route per task
(filled as work proceeds: inline | delegated + trigger evidence)

## Acceptance
- First login with no `case2code_tour_done`: welcome prompt offers tour; skip works.
- Tour walks: create project -> add class -> add 2nd class -> pick relation -> connect -> confirm -> share/AI/Spring Boot.
- Back / next / skip / Esc work; tour re-openable from help button.
- Works in dark mode and at small widths; does not break modals (Ctrl+Enter, autoFocus).
- `npm run build` and `npm run test` pass.

## Progress / evidence
(commit ids and observed results per task; a commit's hash is recorded in the next commit since a commit cannot contain its own hash)
- T1 34789d1: driver.js 1.10.2 (exact pin), useTourStore + 6 vitest tests. test: 3 files / 16 tests passed; build: OK (only pre-existing chunk-size warning).
- T2 (hash: see T3 entry): tourSteps.ts (17 steps, 18 w/o project), tourRunner.ts (driver.js wiring, store-driven auto-advance, Next fallbacks), TourController + TourWelcome, theming CSS in src/index.css, isSidebarCollapsed/setSidebarCollapsed added to useDiagramStore (state only; Sidebar wiring is T3), 5 step tests. test: 4 files / 21 tests passed; build: OK. Browser behaviour NOT verified (no backend to log in).

## Next step
T3.
