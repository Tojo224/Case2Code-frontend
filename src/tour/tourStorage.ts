/** Pure persistence helpers for the adaptive tutorial. Every storage access is guarded. */

export type TourMode = 'adaptive' | 'off';

export interface PersistedTour {
  version: 2;
  /** The user already saw (or was deliberately spared) the welcome card. */
  welcomed: boolean;
  /** `off` hides the checklist and the hints until the help button brings them back. */
  mode: TourMode;
  collapsed: boolean;
  /** Mission id -> completion timestamp (ms). */
  completed: Record<string, number>;
  /** Hints already shown (each hint appears once, ever). */
  dismissedHints: string[];
  hintsDisabled: boolean;
}

export const TOUR_STORAGE_VERSION = 2;
export const STORAGE_KEY_TOUR = 'case2code_tour_v2';
/** Flag written by the former linear tour. Read-only now: `true` migrates to `welcomed`. */
export const LEGACY_STORAGE_KEY_TOUR = 'case2code_tour_done';
const ANONYMOUS_NAMESPACE = 'anon';

export const defaultPersisted = (): PersistedTour => ({
  version: TOUR_STORAGE_VERSION,
  welcomed: false,
  mode: 'adaptive',
  collapsed: false,
  completed: {},
  dismissedHints: [],
  hintsDisabled: false,
});

export const storageKeyFor = (userId?: string | null): string =>
  `${STORAGE_KEY_TOUR}:${userId ? userId : ANONYMOUS_NAMESPACE}`;

/** Validates untrusted JSON, falling back field by field to the defaults. */
export const parsePersisted = (raw: string | null): PersistedTour | null => {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.version !== TOUR_STORAGE_VERSION) return null;

  const base = defaultPersisted();
  const completed: Record<string, number> = {};
  if (d.completed && typeof d.completed === 'object') {
    for (const [id, at] of Object.entries(d.completed as Record<string, unknown>)) {
      if (typeof at === 'number' && Number.isFinite(at)) completed[id] = at;
    }
  }
  return {
    version: TOUR_STORAGE_VERSION,
    welcomed: typeof d.welcomed === 'boolean' ? d.welcomed : base.welcomed,
    mode: d.mode === 'off' ? 'off' : 'adaptive',
    collapsed: typeof d.collapsed === 'boolean' ? d.collapsed : base.collapsed,
    completed,
    dismissedHints: Array.isArray(d.dismissedHints)
      ? d.dismissedHints.filter((h): h is string => typeof h === 'string')
      : [],
    hintsDisabled: typeof d.hintsDisabled === 'boolean' ? d.hintsDisabled : base.hintsDisabled,
  };
};

const readItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const loadPersisted = (userId?: string | null): PersistedTour => {
  const stored = parsePersisted(readItem(storageKeyFor(userId)));
  if (stored) return stored;
  const fresh = defaultPersisted();
  if (readItem(LEGACY_STORAGE_KEY_TOUR) === 'true') fresh.welcomed = true;
  return fresh;
};

export const savePersisted = (userId: string | null | undefined, data: PersistedTour): void => {
  try {
    localStorage.setItem(storageKeyFor(userId), JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode, quota): progress just won't persist.
  }
};
