import type { MissionId } from './missions';
import { hasOpenModal, type TourSnapshot } from './tourSteps';

export type HintId = 'hologram' | 'relationships' | 'attributes' | 'generate' | 'save-version';

export const HINT_COOLDOWN_MS = 90_000;
export const MAX_HINTS_PER_SESSION = 3;
/** Edits (classes, attributes or relationships added/removed) before suggesting a checkpoint. */
export const EDITS_BEFORE_VERSION_HINT = 8;

export interface HintProgress {
  /** Ids of completed missions. */
  completed: ReadonlySet<string>;
  /** Hints already shown (they never come back). */
  seenHints: ReadonlySet<string>;
  hintsDisabled: boolean;
  /** Timestamp of the last hint shown this session. */
  lastHintAt: number | null;
  shownThisSession: number;
  microTourActive: boolean;
  /** Structural edits made this session in the current project. */
  edits: number;
  /** Since when (ms) each hint condition has been continuously true. */
  holdSince: Readonly<Partial<Record<HintId, number>>>;
}

export interface HintDef {
  id: HintId;
  /** Lower number wins when several hints are eligible. */
  priority: number;
  title: string;
  text: string;
  /** Mission whose micro-tour the "Mostrame" button launches; none for explanations. */
  mission?: MissionId;
  /** How long the condition must keep holding before the hint can show. */
  holdMs: number;
  when: (snap: TourSnapshot, progress: HintProgress) => boolean;
}

export const HINTS: readonly HintDef[] = [
  {
    id: 'hologram',
    priority: 1,
    title: 'La IA te hizo una propuesta',
    text: 'Es una vista previa en el lienzo. Si te gusta, tocá «Aplicar al Diagrama» en el chat y se agrega de verdad.',
    holdMs: 0,
    when: (s) => s.hologramPending,
  },
  {
    id: 'relationships',
    priority: 2,
    title: '¿Las conectamos?',
    text: 'Ya tenés dos clases. Unilas con una relación para mostrar cómo se vinculan.',
    mission: 'first-relationship',
    holdMs: 20_000,
    when: (s, p) => s.classCount >= 2 && s.relationshipCount === 0 && !p.completed.has('first-relationship'),
  },
  {
    id: 'attributes',
    priority: 3,
    title: 'Tu clase está medio vacía',
    text: 'Por ahora solo tiene el id. Sumale atributos para definir qué datos guarda.',
    mission: 'add-attributes',
    holdMs: 30_000,
    when: (s, p) => s.hasPkOnlyClass && !p.completed.has('add-attributes'),
  },
  {
    id: 'generate',
    priority: 4,
    title: 'Mirá tu modelo hecho código',
    text: 'Ya tenés relaciones. Probá generar el script SQL, un backend o una app desde tu diagrama.',
    mission: 'generate-code',
    holdMs: 30_000,
    when: (s, p) => s.relationshipCount > 0 && !p.completed.has('generate-code'),
  },
  {
    id: 'save-version',
    priority: 5,
    title: 'Guardá una versión',
    text: 'Hiciste varios cambios. Un punto de control te deja volver atrás si algo sale mal.',
    mission: 'save-version',
    holdMs: 0,
    when: (s, p) =>
      p.edits >= EDITS_BEFORE_VERSION_HINT && s.versionCount === 0 && !p.completed.has('save-version'),
  },
];

export const getHint = (id: string): HintDef | undefined => HINTS.find((h) => h.id === id);

/**
 * Updates the "condition true since" map: conditions that hold keep (or start) their
 * timestamp, the ones that stopped holding are forgotten.
 */
export const updateHoldSince = (
  snap: TourSnapshot,
  progress: HintProgress,
  now: number,
): Partial<Record<HintId, number>> => {
  const next: Partial<Record<HintId, number>> = {};
  for (const hint of HINTS) {
    if (hint.when(snap, progress)) next[hint.id] = progress.holdSince[hint.id] ?? now;
  }
  return next;
};

/** How many structural edits happened between two snapshots of the same project. */
export const countEdits = (prev: TourSnapshot | null, snap: TourSnapshot): number => {
  if (!prev || prev.documentId !== snap.documentId || snap.documentId === null) return 0;
  const size = (s: TourSnapshot) => s.classCount + s.relationshipCount + s.attributeCount;
  return Math.abs(size(snap) - size(prev));
};

/**
 * Picks at most one hint to show right now. Time is injected so it stays testable:
 * respects the cooldown, the per-session cap, open modals and running micro-tours.
 */
export const pickHint = (snap: TourSnapshot, progress: HintProgress, now: number): HintDef | null => {
  if (progress.hintsDisabled || progress.microTourActive) return null;
  if (progress.shownThisSession >= MAX_HINTS_PER_SESSION) return null;
  if (progress.lastHintAt !== null && now - progress.lastHintAt < HINT_COOLDOWN_MS) return null;
  if (hasOpenModal(snap)) return null;

  const eligible = HINTS.filter((h) => {
    if (progress.seenHints.has(h.id)) return false;
    if (!h.when(snap, progress)) return false;
    const since = progress.holdSince[h.id];
    return since !== undefined && now - since >= h.holdMs;
  });
  if (eligible.length === 0) return null;
  return eligible.reduce((best, h) => (h.priority < best.priority ? h : best));
};
