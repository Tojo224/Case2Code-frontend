import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useDiagramStore } from '../store/useDiagramStore';
import { useTourStore } from '../store/useTourStore';
import { buildTourSteps, takeSnapshot, tourSelector, type TourSnapshot, type TourStepDef } from './tourSteps';

const WAIT_MS = 2500;
const AUTO_ADVANCE_DELAY_MS = 350;
const LAYOUT_REFRESH_DELAY_MS = 300;

type Direction = 'forward' | 'back';

/**
 * Starts the guided tour and returns a disposer. All the step logic lives in
 * `tourSteps.ts`; this module only wires driver.js, the stores and the keyboard.
 */
export const runTour = (): (() => void) => {
  const defs = buildTourSteps(takeSnapshot().hasDocument);
  const indexById = new Map(defs.map((d, i) => [d.id, i]));

  let baseline: TourSnapshot = takeSnapshot();
  let armed = true;
  let direction: Direction = 'forward';
  let advanceTimer: number | undefined;
  let layoutTimer: number | undefined;
  let disposed = false;

  const toDriveStep = (def: TourStepDef): DriveStep => ({
    element: def.target
      ? () => document.querySelector(tourSelector(def.target!)) as Element
      : undefined,
    skipMissingElement: def.optional,
    waitForElement: def.wait ? WAIT_MS : 0,
    disableActiveInteraction: def.target ? !def.interactive : undefined,
    advanceOnClick: def.advanceOnClick,
    popover: {
      title: def.title,
      description: def.description,
      side: def.side,
      align: def.align,
    },
  });

  const isDone = (def: TourStepDef) => def.done?.(takeSnapshot(), baseline) ?? false;

  const goTo = (from: number, to: number, dir: Direction) => {
    if (disposed || drv.getActiveIndex() !== from) return;
    window.clearTimeout(advanceTimer);
    direction = dir;
    const step = drv.getConfig().steps?.[to];
    // Only wait for late elements when moving forward; going back must not stall.
    if (step) step.waitForElement = dir === 'forward' && defs[to]?.wait ? WAIT_MS : 0;
    drv.moveTo(to);
  };

  const nextIndexFor = (index: number) => {
    const def = defs[index];
    const target = def.doneGoTo && isDone(def) ? indexById.get(def.doneGoTo) : undefined;
    return target ?? index + 1;
  };

  const handleNext = (index: number) => {
    const def = defs[index];
    if (!def) return;
    if (def.done && !isDone(def)) def.onSkipTask?.();
    if (index >= defs.length - 1) {
      useTourStore.getState().finish();
      return;
    }
    goTo(index, nextIndexFor(index), 'forward');
  };

  const handlePrev = (index: number) => {
    defs[index]?.onBack?.();
    goTo(index, index - 1, 'back');
  };

  const scheduleAutoAdvance = () => {
    if (disposed) return;
    const index = drv.getActiveIndex();
    if (index === undefined) return;
    const def = defs[index];
    if (!def?.done) return;

    if (!armed) {
      // Entered by going back: wait for the task to become undone before re-arming.
      if (!isDone(def)) armed = true;
      return;
    }
    if (!isDone(def)) return;

    window.clearTimeout(advanceTimer);
    advanceTimer = window.setTimeout(() => {
      if (disposed || drv.getActiveIndex() !== index || !isDone(def)) return;
      goTo(index, nextIndexFor(index), 'forward');
    }, AUTO_ADVANCE_DELAY_MS);
  };

  const addSkipButton = (wrapper: HTMLElement, index: number | undefined) => {
    if (index === undefined || index >= defs.length - 1) return;
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'c2c-tour-skip';
    skip.textContent = 'Saltar tutorial';
    skip.addEventListener('click', () => useTourStore.getState().skip());
    wrapper.appendChild(skip);
  };

  const drv = driver({
    steps: defs.map(toDriveStep),
    showProgress: true,
    progressText: 'paso {{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: '¡Listo!',
    closeBtnLabel: 'Cerrar tutorial',
    popoverClass: 'c2c-tour',
    allowClose: true,
    // Arrow keys would hijack text inputs; Esc is handled below.
    allowKeyboardControl: false,
    overlayClickBehavior: 'none',
    overlayOpacity: 0.6,
    stagePadding: 6,
    stageRadius: 8,
    smoothScroll: true,
    onHighlightStarted: (_el, _step, { index }) => {
      const def = index !== undefined ? defs[index] : undefined;
      if (!def) return;
      baseline = takeSnapshot();
      armed = direction === 'forward' ? true : !isDone(def);
      def.onEnter?.();
      // Layout may shift (sidebar expanding, modals animating): re-measure shortly after.
      window.clearTimeout(layoutTimer);
      layoutTimer = window.setTimeout(() => drv.refresh(), LAYOUT_REFRESH_DELAY_MS);
      scheduleAutoAdvance();
    },
    onHighlighted: (el, _step, { index }) => {
      // The popover grabs focus when it renders; give it back to modal inputs.
      if (index !== undefined && defs[index]?.focusTarget && el instanceof HTMLElement) el.focus();
    },
    onPopoverRender: (popover, { index }) => addSkipButton(popover.wrapper, index),
    onNextClick: (_el, _step, { index }) => {
      if (index !== undefined) handleNext(index);
    },
    onPrevClick: (_el, _step, { index }) => {
      if (index !== undefined) handlePrev(index);
    },
    onCloseClick: () => useTourStore.getState().skip(),
  });

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Escape') useTourStore.getState().skip();
  };
  window.addEventListener('keyup', onKeyUp);

  // The popover steals focus from the class modal, so its own Ctrl+Enter handler never
  // sees the keystroke. Forward it to the submit button, but only when the event comes
  // from the popover (inside the modal, its own handler already submits).
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return;
    if (!(e.target instanceof Element) || !e.target.closest('.driver-popover')) return;
    const submit = document.querySelector<HTMLElement>(tourSelector('create-class-submit'));
    if (!submit) return;
    e.preventDefault();
    submit.click();
  };
  window.addEventListener('keydown', onKeyDown);

  const unsubscribe = useDiagramStore.subscribe(scheduleAutoAdvance);

  drv.drive(0);

  return () => {
    disposed = true;
    window.clearTimeout(advanceTimer);
    window.clearTimeout(layoutTimer);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('keydown', onKeyDown);
    unsubscribe();
    try {
      drv.destroy();
    } catch {
      // Already torn down.
    }
  };
};
