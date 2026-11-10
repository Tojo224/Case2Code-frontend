import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { useTourStore } from '../store/useTourStore';
import { useVersionStore } from '../store/useVersionStore';
import { getMission } from './missions';
import { getMicroTour, takeSnapshot, tourSelector, type TourSnapshot, type TourStepDef } from './tourSteps';

const WAIT_MS = 2500;
const AUTO_ADVANCE_DELAY_MS = 350;
const END_DELAY_MS = 500;
const LAYOUT_REFRESH_DELAY_MS = 300;

type Direction = 'forward' | 'back';

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Runs the micro-tour of one mission and returns a disposer. All the step logic lives in
 * `tourSteps.ts`; this module only wires driver.js, the stores and the keyboard. The tour
 * highlights one thing at a time and ends by itself when its task is done.
 */
export const runMicroTour = (missionId: string): (() => void) => {
  const tour = getMicroTour(missionId);
  const mission = getMission(missionId);
  const defs = tour?.steps ?? [];
  const finishNow = () => useTourStore.getState().finish();

  // Nothing to show (unknown mission, or its only anchor is not on screen): end quietly.
  const first = defs[0];
  if (!first || (first.optional && !first.wait && !document.querySelector(tourSelector(first.target ?? '')))) {
    window.setTimeout(finishNow, 0);
    return () => undefined;
  }

  let baseline: TourSnapshot = takeSnapshot();
  const doneAtStart = mission?.detect(baseline) ?? false;
  let armed = true;
  let direction: Direction = 'forward';
  let advanceTimer: number | undefined;
  let layoutTimer: number | undefined;
  let endTimer: number | undefined;
  let disposed = false;
  const reduceMotion = prefersReducedMotion();

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
  const isLast = (index: number) => index >= defs.length - 1;

  const goTo = (from: number, to: number, dir: Direction) => {
    if (disposed || drv.getActiveIndex() !== from) return;
    window.clearTimeout(advanceTimer);
    direction = dir;
    const step = drv.getConfig().steps?.[to];
    // Only wait for late elements when moving forward; going back must not stall.
    if (step) step.waitForElement = dir === 'forward' && defs[to]?.wait ? WAIT_MS : 0;
    drv.moveTo(to);
  };

  const handleNext = (index: number) => {
    const def = defs[index];
    if (!def) return;
    if (def.done && !isDone(def)) def.onSkipTask?.();
    if (isLast(index)) {
      finishNow();
      return;
    }
    goTo(index, index + 1, 'forward');
  };

  const handlePrev = (index: number) => {
    defs[index]?.onBack?.();
    goTo(index, index - 1, 'back');
  };

  const scheduleEnd = () => {
    if (endTimer !== undefined) return;
    endTimer = window.setTimeout(() => {
      if (!disposed) finishNow();
    }, END_DELAY_MS);
  };

  const onStoreChange = () => {
    if (disposed) return;
    // The task of the whole mission is done: let the user see the result, then leave.
    if (tour?.endOnMission && !doneAtStart && mission?.detect(takeSnapshot())) {
      scheduleEnd();
      return;
    }

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
      if (!useTourStore.getState().notice) {
        useTourStore.getState().showNotice(`¡Paso completado! ${def.title}`, null);
      }
      if (isLast(index)) finishNow();
      else goTo(index, index + 1, 'forward');
    }, AUTO_ADVANCE_DELAY_MS);
  };

  const addExitButton = (wrapper: HTMLElement) => {
    const exit = document.createElement('button');
    exit.type = 'button';
    exit.className = 'c2c-tour-skip';
    exit.textContent = 'Salir de la guía';
    exit.addEventListener('click', () => useTourStore.getState().skip());
    wrapper.appendChild(exit);
  };

  const drv = driver({
    steps: defs.map(toDriveStep),
    showProgress: defs.length > 1,
    progressText: 'paso {{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: '¡Listo!',
    closeBtnLabel: 'Cerrar guía',
    popoverClass: 'c2c-tour',
    allowClose: true,
    // Arrow keys would hijack text inputs; Esc is handled below.
    allowKeyboardControl: false,
    overlayClickBehavior: 'none',
    overlayOpacity: 0.6,
    stagePadding: 6,
    stageRadius: 8,
    animate: !reduceMotion,
    smoothScroll: !reduceMotion,
    onHighlightStarted: (_el, _step, { index }) => {
      const def = index !== undefined ? defs[index] : undefined;
      if (!def) return;
      baseline = takeSnapshot();
      armed = direction === 'forward' ? true : !isDone(def);
      def.onEnter?.();
      // Layout may shift (sidebar expanding, modals animating): re-measure shortly after.
      window.clearTimeout(layoutTimer);
      layoutTimer = window.setTimeout(() => drv.refresh(), LAYOUT_REFRESH_DELAY_MS);
      onStoreChange();
    },
    onHighlighted: (el, _step, { index }) => {
      // The popover grabs focus when it renders; give it back to modal inputs.
      if (index !== undefined && defs[index]?.focusTarget && el instanceof HTMLElement) el.focus();
    },
    onPopoverRender: (popover) => addExitButton(popover.wrapper),
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

  const unsubscribers = [
    useDiagramStore.subscribe(onStoreChange),
    useCollaborationStore.subscribe(onStoreChange),
    useVersionStore.subscribe(onStoreChange),
  ];

  drv.drive(0);

  return () => {
    disposed = true;
    window.clearTimeout(advanceTimer);
    window.clearTimeout(layoutTimer);
    window.clearTimeout(endTimer);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('keydown', onKeyDown);
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    try {
      drv.destroy();
    } catch {
      // Already torn down.
    }
  };
};
