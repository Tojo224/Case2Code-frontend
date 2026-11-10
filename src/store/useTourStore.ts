import { create } from 'zustand';
import { nextPendingMission, missionHasTour } from '../tour/missions';
import {
  defaultPersisted,
  loadPersisted,
  savePersisted,
  type PersistedTour,
  type TourMode,
} from '../tour/tourStorage';
import { useAuthStore } from './useAuthStore';

/** Short, non-blocking message shown when a mission completes. */
export interface TourNotice {
  /** Changes on every notice so the card can restart its auto-dismiss timer. */
  key: number;
  message: string;
  /** Mission the "next step" pointer refers to, if any is still pending. */
  nextMissionId: string | null;
}

interface TourState extends PersistedTour {
  /** A micro-tour is running. */
  isActive: boolean;
  activeMission: string | null;
  isWelcomeOpen: boolean;
  notice: TourNotice | null;
  activeHintId: string | null;
  /** User id the persisted state was loaded for (`null` = anonymous); `undefined` = never loaded. */
  loadedFor: string | null | undefined;

  initTour: () => void;
  openWelcome: () => void;
  closeWelcome: () => void;
  /** Starts the micro-tour of a mission (defaults to the first pending one that has a tour). */
  start: (missionId?: string) => void;
  finish: () => void;
  skip: () => void;
  /** Re-opens the checklist expanded and offers the micro-tours again. */
  restart: () => void;
  /** Welcome choice "Explorar por mi cuenta": checklist and hints stay on. */
  explore: () => void;
  markWelcomed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  hideChecklist: () => void;
  completeMissions: (ids: string[], at?: number) => void;
  showNotice: (message: string, nextMissionId: string | null) => void;
  clearNotice: () => void;
  showHint: (id: string) => void;
  clearHint: () => void;
  disableHints: () => void;
}

const currentUserId = (): string | null => useAuthStore.getState().currentUser?.id ?? null;

const pickPersisted = (s: PersistedTour): PersistedTour => ({
  version: s.version,
  welcomed: s.welcomed,
  mode: s.mode,
  collapsed: s.collapsed,
  completed: s.completed,
  dismissedHints: s.dismissedHints,
  hintsDisabled: s.hintsDisabled,
});

const VOLATILE_DEFAULTS = {
  isActive: false,
  activeMission: null,
  isWelcomeOpen: false,
  notice: null,
  activeHintId: null,
} as const;

let noticeCounter = 0;

export const useTourStore = create<TourState>((set, get) => {
  /** Applies a change and persists the durable part for the current user. */
  const update = (patch: Partial<TourState>) => {
    set(patch);
    const { loadedFor } = get();
    savePersisted(loadedFor === undefined ? currentUserId() : loadedFor, pickPersisted(get()));
  };

  return {
    ...defaultPersisted(),
    ...VOLATILE_DEFAULTS,
    loadedFor: undefined,

    initTour: () => {
      const userId = currentUserId();
      set({ ...loadPersisted(userId), ...VOLATILE_DEFAULTS, loadedFor: userId });
    },

    openWelcome: () => set({ isWelcomeOpen: true }),

    closeWelcome: () => update({ isWelcomeOpen: false, welcomed: true }),

    start: (missionId) => {
      const { completed } = get();
      const target = missionId ?? nextPendingMission(completed)?.id;
      if (!target || !missionHasTour(target)) return;
      update({
        isActive: true,
        activeMission: target,
        isWelcomeOpen: false,
        welcomed: true,
        mode: 'adaptive',
        notice: null,
        activeHintId: null,
      });
    },

    finish: () => set({ isActive: false, activeMission: null }),

    skip: () => {
      if (get().isWelcomeOpen) get().closeWelcome();
      set({ isActive: false, activeMission: null });
    },

    restart: () =>
      update({
        ...VOLATILE_DEFAULTS,
        welcomed: true,
        mode: 'adaptive' as TourMode,
        collapsed: false,
        dismissedHints: [],
        hintsDisabled: false,
      }),

    explore: () => update({ isWelcomeOpen: false, welcomed: true, mode: 'adaptive' }),

    markWelcomed: () => update({ welcomed: true }),

    setCollapsed: (collapsed) => update({ collapsed }),

    hideChecklist: () => update({ mode: 'off', activeHintId: null, notice: null }),

    completeMissions: (ids, at = Date.now()) => {
      const completed = { ...get().completed };
      let changed = false;
      for (const id of ids) {
        if (!(id in completed)) {
          completed[id] = at;
          changed = true;
        }
      }
      if (changed) update({ completed });
    },

    showNotice: (message, nextMissionId) =>
      set({ notice: { key: ++noticeCounter, message, nextMissionId } }),

    clearNotice: () => set({ notice: null }),

    showHint: (id) => {
      const { dismissedHints } = get();
      update({
        activeHintId: id,
        dismissedHints: dismissedHints.includes(id) ? dismissedHints : [...dismissedHints, id],
      });
    },

    clearHint: () => set({ activeHintId: null }),

    disableHints: () => update({ hintsDisabled: true, activeHintId: null }),
  };
});
