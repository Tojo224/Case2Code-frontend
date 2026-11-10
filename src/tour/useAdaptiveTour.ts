import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { useTourStore } from '../store/useTourStore';
import { useVersionStore } from '../store/useVersionStore';
import {
  countEdits,
  getHint,
  pickHint,
  updateHoldSince,
  type HintId,
  type HintProgress,
} from './hints';
import { buildMissionNotice, evaluateMissions } from './missions';
import { sameInputs, snapshotInputs, takeSnapshot, type TourSnapshot } from './tourSteps';

const HINT_TICK_MS = 5_000;

/**
 * Drives the adaptive tutorial: keeps the persisted state in sync with the signed-in user,
 * detects completed missions from the stores and decides when a contextual hint may show.
 * Timers and subscriptions live here; the decisions themselves are pure (missions.ts, hints.ts).
 */
export const useAdaptiveTour = () => {
  const userId = useAuthStore((s) => s.currentUser?.id ?? null);

  // Load the progress of whoever is signed in (the anonymous namespace until a session exists).
  useEffect(() => {
    useTourStore.getState().initTour();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    let prev: TourSnapshot | null = null;
    let lastInputs: readonly unknown[] | null = null;
    let edits = 0;
    let holdSince: Partial<Record<HintId, number>> = {};
    let lastHintAt: number | null = null;
    let shownThisSession = 0;

    const detectMissions = () => {
      // The stores also emit for cursors, drags and typing: skip when nothing the snapshot reads changed.
      const inputs = snapshotInputs();
      if (sameInputs(lastInputs, inputs)) return;

      const tour = useTourStore.getState();
      // Wait for the user's own state to be loaded and for projects to finish loading.
      // Inputs are only remembered after this guard, so a skipped run is retried.
      if (tour.loadedFor !== userId || useDiagramStore.getState().isLoading) return;
      lastInputs = inputs;

      const snap = takeSnapshot();
      const { newlyDone, announce } = evaluateMissions(prev, snap, tour.completed);
      edits = prev && prev.documentId === snap.documentId ? edits + countEdits(prev, snap) : 0;
      prev = snap;

      if (newlyDone.length === 0) return;
      tour.completeMissions(newlyDone);
      if (announce.length > 0 && tour.mode === 'adaptive') {
        const { message, nextMissionId } = buildMissionNotice(
          announce[0],
          useTourStore.getState().completed,
        );
        useTourStore.getState().showNotice(message, nextMissionId);
      }
    };

    const tickHints = () => {
      const tour = useTourStore.getState();
      if (tour.loadedFor !== userId || tour.mode !== 'adaptive' || tour.hintsDisabled) return;

      const snap = takeSnapshot();
      const now = Date.now();
      const progress: HintProgress = {
        completed: new Set(Object.keys(tour.completed)),
        seenHints: new Set(tour.dismissedHints),
        hintsDisabled: tour.hintsDisabled,
        lastHintAt,
        shownThisSession,
        microTourActive: tour.isActive,
        edits,
        holdSince,
      };
      holdSince = updateHoldSince(snap, progress, now);

      // A visible hint goes away by itself once what it suggested is no longer relevant.
      if (tour.activeHintId) {
        const visible = getHint(tour.activeHintId);
        if (!visible || !visible.when(snap, progress)) tour.clearHint();
        return;
      }

      const hint = pickHint(snap, { ...progress, holdSince }, now);
      if (!hint) return;
      lastHintAt = now;
      shownThisSession += 1;
      tour.showHint(hint.id);
    };

    detectMissions();
    const unsubscribers = [
      useDiagramStore.subscribe(detectMissions),
      useCollaborationStore.subscribe(detectMissions),
      useVersionStore.subscribe(detectMissions),
    ];
    const timer = window.setInterval(tickHints, HINT_TICK_MS);

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.clearInterval(timer);
    };
  }, [userId]);
};
