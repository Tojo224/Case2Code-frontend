import { describe, it, expect } from 'vitest';
import {
  EDITS_BEFORE_VERSION_HINT,
  HINT_COOLDOWN_MS,
  MAX_HINTS_PER_SESSION,
  countEdits,
  pickHint,
  updateHoldSince,
  type HintProgress,
} from './hints';
import { EMPTY_SNAPSHOT, type TourSnapshot } from './tourSteps';

const snap = (o: Partial<TourSnapshot> = {}): TourSnapshot => ({
  ...EMPTY_SNAPSHOT,
  hasDocument: true,
  documentId: 'd1',
  ...o,
});

const progress = (o: Partial<HintProgress> = {}): HintProgress => ({
  completed: new Set(),
  seenHints: new Set(),
  hintsDisabled: false,
  lastHintAt: null,
  shownThisSession: 0,
  microTourActive: false,
  edits: 0,
  holdSince: {},
  ...o,
});

const twoClasses = snap({ classCount: 2, relationshipCount: 0 });

describe('pickHint', () => {
  it('waits until the condition has held long enough', () => {
    const p = progress({ holdSince: { relationships: 1_000 } });
    expect(pickHint(twoClasses, p, 1_000 + 19_999)).toBeNull();
    expect(pickHint(twoClasses, p, 1_000 + 20_000)?.id).toBe('relationships');
  });

  it('suggests attributes for a class with only the id after 30 s', () => {
    const s = snap({ classCount: 1, hasPkOnlyClass: true });
    const p = progress({ holdSince: { attributes: 0 } });
    expect(pickHint(s, p, 29_999)).toBeNull();
    expect(pickHint(s, p, 30_000)?.id).toBe('attributes');
  });

  it('suggests generating code once relationships exist and it was never opened', () => {
    const s = snap({ classCount: 2, relationshipCount: 1 });
    expect(pickHint(s, progress({ holdSince: { generate: 0 } }), 30_000)?.id).toBe('generate');
    const done = progress({ holdSince: { generate: 0 }, completed: new Set(['generate-code']) });
    expect(pickHint(s, done, 60_000)).toBeNull();
  });

  it('suggests a checkpoint after many edits without any version', () => {
    const s = snap({ classCount: 3, versionCount: 0 });
    const few = progress({ edits: EDITS_BEFORE_VERSION_HINT - 1, holdSince: {} });
    expect(pickHint(s, few, 0)).toBeNull();
    const many = progress({ edits: EDITS_BEFORE_VERSION_HINT, holdSince: { 'save-version': 0 } });
    expect(pickHint(s, many, 0)?.id).toBe('save-version');
    expect(pickHint(snap({ versionCount: 1 }), many, 0)).toBeNull();
  });

  it('explains a pending AI proposal immediately, without a mission button', () => {
    const hint = pickHint(snap({ hologramPending: true }), progress({ holdSince: { hologram: 5 } }), 5);
    expect(hint?.id).toBe('hologram');
    expect(hint?.mission).toBeUndefined();
  });

  it('shows at most one hint, the highest priority one', () => {
    const p = progress({ holdSince: { hologram: 0, relationships: 0, attributes: 0 } });
    const all = snap({ classCount: 2, hasPkOnlyClass: true, hologramPending: true });
    expect(pickHint(all, p, 100_000)?.id).toBe('hologram');
    const noHolo = snap({ classCount: 2, hasPkOnlyClass: true });
    expect(pickHint(noHolo, p, 100_000)?.id).toBe('relationships');
  });

  it('shows each hint once', () => {
    const p = progress({ holdSince: { relationships: 0 }, seenHints: new Set(['relationships']) });
    expect(pickHint(twoClasses, p, 100_000)).toBeNull();
  });

  it('respects the cooldown between hints and the session cap', () => {
    const base = { holdSince: { relationships: 0 } };
    const now = 1_000_000;
    expect(pickHint(twoClasses, progress({ ...base, lastHintAt: now - HINT_COOLDOWN_MS + 1 }), now)).toBeNull();
    expect(pickHint(twoClasses, progress({ ...base, lastHintAt: now - HINT_COOLDOWN_MS }), now)?.id).toBe(
      'relationships',
    );
    expect(pickHint(twoClasses, progress({ ...base, shownThisSession: MAX_HINTS_PER_SESSION }), now)).toBeNull();
  });

  it('stays silent while a modal or a micro-tour is open, or when hints are disabled', () => {
    const base = { holdSince: { relationships: 0 } };
    expect(pickHint({ ...twoClasses, isCreateClassModalOpen: true }, progress(base), 100_000)).toBeNull();
    expect(pickHint({ ...twoClasses, isSqlModalOpen: true }, progress(base), 100_000)).toBeNull();
    expect(pickHint(twoClasses, progress({ ...base, microTourActive: true }), 100_000)).toBeNull();
    expect(pickHint(twoClasses, progress({ ...base, hintsDisabled: true }), 100_000)).toBeNull();
  });
});

describe('updateHoldSince', () => {
  it('starts the clock when a condition begins, keeps it, and forgets it when it stops', () => {
    const first = updateHoldSince(twoClasses, progress(), 1_000);
    expect(first.relationships).toBe(1_000);
    const later = updateHoldSince(twoClasses, progress({ holdSince: first }), 9_000);
    expect(later.relationships).toBe(1_000);
    const connected = snap({ classCount: 2, relationshipCount: 1 });
    expect(updateHoldSince(connected, progress({ holdSince: later }), 10_000).relationships).toBeUndefined();
  });
});

describe('countEdits', () => {
  it('counts structural changes inside the same project only', () => {
    const a = snap({ classCount: 1, attributeCount: 1 });
    expect(countEdits(a, snap({ classCount: 2, attributeCount: 2 }))).toBe(2);
    expect(countEdits(a, snap({ documentId: 'other', classCount: 5 }))).toBe(0);
    expect(countEdits(null, a)).toBe(0);
    expect(countEdits(a, a)).toBe(0);
  });
});
