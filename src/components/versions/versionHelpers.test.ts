import { describe, it, expect } from 'vitest';
import {
  changeTone,
  formatRelativeTime,
  kindBadgeClass,
  kindLabel,
  pluralize,
  versionTitle,
} from './versionHelpers';
import type { DiagramVersion } from '../../types/versions';

const NOW = new Date('2026-06-01T12:00:00Z').getTime();
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

const baseVersion: DiagramVersion = {
  id: 'v1',
  diagram_id: 'd1',
  number: 1,
  kind: 'AUTO',
  author_id: 'u1',
  author_name: 'Ana',
  author_type: 'USER',
  document_version: 1,
  class_count: 0,
  relationship_count: 0,
  created_at: ago(0),
};

describe('formatRelativeTime', () => {
  it('formats recent, minutes, hours, days, months and years', () => {
    expect(formatRelativeTime(ago(10), NOW)).toBe('recién');
    expect(formatRelativeTime(ago(5 * 60), NOW)).toBe('hace 5 min');
    expect(formatRelativeTime(ago(3600), NOW)).toBe('hace 1 hora');
    expect(formatRelativeTime(ago(5 * 3600), NOW)).toBe('hace 5 horas');
    expect(formatRelativeTime(ago(86400), NOW)).toBe('hace 1 día');
    expect(formatRelativeTime(ago(3 * 86400), NOW)).toBe('hace 3 días');
    expect(formatRelativeTime(ago(65 * 86400), NOW)).toBe('hace 2 meses');
    expect(formatRelativeTime(ago(800 * 86400), NOW)).toBe('hace 2 años');
  });

  it('never returns negative values for future dates and tolerates bad input', () => {
    expect(formatRelativeTime(ago(-600), NOW)).toBe('recién');
    expect(formatRelativeTime('not-a-date', NOW)).toBe('');
  });
});

describe('badges and titles', () => {
  it('maps every kind to its Spanish label', () => {
    expect(kindLabel('CHECKPOINT')).toBe('Checkpoint');
    expect(kindLabel('AUTO')).toBe('Automática');
    expect(kindLabel('PRE_AI')).toBe('Antes de la IA');
    expect(kindLabel('PRE_RESTORE')).toBe('Antes de restaurar');
  });

  it('gives each kind a distinct badge style', () => {
    const classes = (['CHECKPOINT', 'AUTO', 'PRE_AI', 'PRE_RESTORE'] as const).map(kindBadgeClass);
    expect(new Set(classes).size).toBe(4);
  });

  it('uses the label as title, falling back to the kind', () => {
    expect(versionTitle({ ...baseVersion, label: '  Entrega 1 ' })).toBe('Entrega 1');
    expect(versionTitle({ ...baseVersion, label: '   ' })).toBe('Automática');
    expect(versionTitle({ ...baseVersion, label: null, kind: 'PRE_AI' })).toBe('Antes de la IA');
  });
});

describe('misc helpers', () => {
  it('pluralizes', () => {
    expect(pluralize(1, 'clase', 'clases')).toBe('1 clase');
    expect(pluralize(0, 'clase', 'clases')).toBe('0 clases');
  });

  it('derives change tone from the change kind', () => {
    expect(changeTone('class_added')).toBe('added');
    expect(changeTone('relationship_removed')).toBe('removed');
    expect(changeTone('attribute_changed')).toBe('changed');
    expect(changeTone('class_renamed')).toBe('changed');
  });
});
