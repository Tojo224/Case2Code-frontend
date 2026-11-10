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
- [x] T3 `data-tour` anchors on Navbar/Sidebar/Canvas/Modals; lift sidebar collapse state into a store
- [x] T4 help entry (Navbar next to ThemeToggle) + auto-start for first-time users after login
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
- T2 cb42dee: tourSteps.ts (17 steps, 18 w/o project), tourRunner.ts (driver.js wiring, store-driven auto-advance, Next fallbacks), TourController + TourWelcome, theming CSS in src/index.css, isSidebarCollapsed/setSidebarCollapsed added to useDiagramStore (state only; Sidebar wiring is T3), 5 step tests. test: 4 files / 21 tests passed; build: OK. Browser behaviour NOT verified (no backend to log in).
- T3 16f704e: data-tour anchors (navbar-project-select/new-diagram/add-class/ai/springboot/xmi/share, theme-toggle, user-menu, sidebar, sidebar-tool-<TYPE> (POINTER for select), canvas, class-node, empty-create-project, create-class-name/attributes/submit, relationship-modal/save); RelationshipSidebar collapse now read from useDiagramStore (isSidebarCollapsed/setSidebarCollapsed), responsive init and <768 auto-collapse kept. test: 4 files / 21 passed; build OK.
- T4 6842743: help button (HelpCircle, data-tour=help-button, only when logged in) in Navbar next to ThemeToggle, "Ver tutorial" in UserMenu, src/tour/offerWelcome.ts called after fetchDiagrams in App init and after login/register in AuthModal (silent when logged out, auth modal open, load error, completed/skipped, or already active); 6 tests. test: 5 files / 27 passed; build OK. Browser behaviour NOT verified (needs backend login).

- Route: T1-T4 delegated (one writer; mapping trigger + writer trigger, 25 files). Orchestrator re-ran `npm run test` (5 files / 27 passed) and `npm run build` (OK) on the branch.
- Native review (range main..f9b4be7, tier high via AuthModal.tsx, consent granted by user): approved, acknowledged, authority burned. Non-blocking advisories, to handle later:
  - R3 WARNING `tourSteps.ts:150-190`: possible dead-end on the class-node step.
  - R3 WARNING `tourRunner.ts:15-172`: runner has no unit tests.
  - R2 SUGGESTION: duplicate finish/skip in `useTourStore.ts:58-66`; runner mutates driver config (`tourRunner.ts:42-50`); hardcoded ids in `tourSteps.test.ts:44-51`.

- Browser verification (local backend with temp SQLite + vite over HTTP; test account on localhost) found 3 defects, fixed in the T4b commit:
  - Canvas dead while highlighted: driver.js forces `pointer-events: auto` on descendants and the LiveCursors overlay (`pointer-events-none`) swallowed double-click and connect-drag. Fix: CSS override now covers `.pointer-events-none` (src/index.css). Verified: double-click opens the class modal during the tour.
  - Ctrl+Enter dead in the class modal while the tour is active (popover steals focus outside the modal's onKeyDown). Fix: keydown listener in tourRunner forwarding to the submit button only when the event comes from the popover. Verified: single class created, tour advanced.
  - Wrong assumption (my mapping): dragging a connection creates the relationship immediately; RelationshipModal opens only by editing the edge. Fix: `relationshipCount` in the snapshot, `relation-drag` is done when a relationship is created, new step `relation-edit` targeting the edge label (`data-tour="relation-edge"`), Next opens the editor as fallback. The tour now has 18 steps when a project already exists (19 when it must create one first). Verified in the browser through the finish step; the real double-click on the edge label was not exercised because test classes were stacked and covered the label.
  - Copy: step "Sumá una segunda clase" now says to double-click away from the first class.
  - Checks after fix: `npm run test` 5 files / 28 passed; `npm run build` OK.
- Known, not fixed: an interrupted tour offers the welcome again on every reload (only finish/skip persists); popover can partially cover the connection-mode pill / part of the relationship modal on 1024px.

## Next step
Decide on the review advisories and T5 (contextual tips). Light-mode and small-width checks still pending. Push / PR are the user's call.

## Adaptive redesign (replaces the linear 19-step autoplay)
Problem: the linear tour showed everything up front and forced each step. Now the tutorial adapts to what the user does.
- Missions ("Primeros pasos", 9, detected from store state, never forced): create-project, first-class, add-attributes, second-class, first-relationship, ask-ai, generate-code, save-version, invite-team. Pure `detect(snapshot)` in `src/tour/missions.ts`; snapshot extended in `tourSteps.ts` (`takeSnapshot`, also reads collaboration and version stores).
- Micro-tours: the existing step definitions split per mission (`getMicroTour`), run by `runMicroTour` in `tourRunner.ts` only on "Mostrame como"; one highlight at a time, ends by itself when the task is done. Click-through CSS, Ctrl+Enter forwarding, Esc and relationship detection kept. `save-version` targets `data-tour="navbar-history"` (optional step: skipped if the anchor is missing).
- Hints: pure `pickHint(snapshot, progress, now)` in `hints.ts`: max 1 hint, 90 s cooldown, max 3 per session, never with a modal or micro-tour open, each hint shown once ever, "Ahora no" / "No mostrar mas consejos". Rules: hologram proposal (explain "Aplicar al Diagrama"), 2+ classes and 0 relationships for 20 s, class with only the id for 30 s, relationships but no code generation for 30 s, 8+ edits without a version.
- Welcome: two-choice non-modal card ("Guiarme paso a paso" / "Explorar por mi cuenta"), only for users with no classes anywhere and not welcomed before (`decideWelcome`); experienced users are silently marked welcomed and their missions auto-complete without toasts.
- Persistence: `case2code_tour_v2:<userId|anon>` (version, welcomed, mode, collapsed, completed ids with timestamps, dismissedHints, hintsDisabled); legacy `case2code_tour_done=true` migrates to `welcomed`. `restart()` (help button) re-opens the checklist expanded and re-enables hints; the old linear flow, `completed` flag and welcome modal were removed.
- Feedback/a11y: mission toast with pointer to the next mission, `role=status aria-live=polite`, reduced-motion respected, no focus trap outside micro-tours, bottom-left stack never blocks the canvas.
- Evidence: `npx vitest run` 9 files / 80 passed, `npx tsc --noEmit` clean, `npm run build` OK. Browser behaviour NOT verified (no backend). Pending: `navbar-history` anchor owned by the version-control work; light-mode / phone-width visual check.

