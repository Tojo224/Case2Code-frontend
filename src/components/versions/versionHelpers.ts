import type { DiagramVersion, VersionKind } from '../../types/versions';

export const KIND_LABELS: Record<VersionKind, string> = {
  CHECKPOINT: 'Checkpoint',
  AUTO: 'Automática',
  PRE_AI: 'Antes de la IA',
  PRE_RESTORE: 'Antes de restaurar',
};

export function kindLabel(kind: VersionKind): string {
  return KIND_LABELS[kind] ?? kind;
}

const KIND_BADGE_CLASSES: Record<VersionKind, string> = {
  CHECKPOINT:
    'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  AUTO: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  PRE_AI:
    'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  PRE_RESTORE:
    'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
};

export function kindBadgeClass(kind: VersionKind): string {
  return KIND_BADGE_CLASSES[kind] ?? KIND_BADGE_CLASSES.AUTO;
}

/** Spanish (rioplatense) relative time, e.g. "hace 5 min". `now` is injectable for tests. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 45) return 'recién';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(seconds / 3600);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.round(seconds / 86400);
  if (days < 30) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  const months = Math.round(days / 30);
  if (months < 12) return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.round(days / 365);
  return `hace ${years} ${years === 1 ? 'año' : 'años'}`;
}

/** Main line of a version row: its label when named, otherwise the kind. */
export function versionTitle(version: DiagramVersion): string {
  const label = version.label?.trim();
  return label ? label : kindLabel(version.kind);
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export type ChangeTone = 'added' | 'removed' | 'changed';

/** Maps a backend change kind (class_added, attribute_changed, ...) to a visual tone. */
export function changeTone(kind: string): ChangeTone {
  if (kind.endsWith('_added')) return 'added';
  if (kind.endsWith('_removed')) return 'removed';
  return 'changed';
}
