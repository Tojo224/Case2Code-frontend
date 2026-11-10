import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DiagramVersion, VersionDiff } from '../types/versions';
import type { CanonicalUmlDocument } from '../types/uml';

vi.mock('../services/versionsApi', () => ({
  versionsApi: {
    list: vi.fn(),
    createCheckpoint: vi.fn(),
    get: vi.fn(),
    diff: vi.fn(),
    restore: vi.fn(),
  },
}));

import { versionsApi } from '../services/versionsApi';
import { useDiagramStore } from './useDiagramStore';
import { useVersionStore } from './useVersionStore';

const api = vi.mocked(versionsApi);

const version = (number: number, extra: Partial<DiagramVersion> = {}): DiagramVersion => ({
  id: `v${number}`,
  diagram_id: 'd1',
  number,
  kind: 'CHECKPOINT',
  author_id: 'u1',
  author_name: 'Ana',
  author_type: 'USER',
  document_version: number,
  class_count: 0,
  relationship_count: 0,
  created_at: '2026-06-01T12:00:00Z',
  ...extra,
});

const diffOf = (to: number | null = null): VersionDiff => ({
  diagram_id: 'd1',
  from_number: 1,
  to_number: to,
  changes: [{ kind: 'class_added', target_id: 'c1', description: 'Se agregó la clase Producto' }],
  summary: '1 clase agregada',
});

describe('useVersionStore', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useVersionStore.getState().reset();
  });

  it('opens and closes the panel', () => {
    useVersionStore.getState().openPanel();
    expect(useVersionStore.getState().isPanelOpen).toBe(true);
    useVersionStore.getState().closePanel();
    expect(useVersionStore.getState().isPanelOpen).toBe(false);
  });

  it('loads versions and toggles loading', async () => {
    api.list.mockResolvedValue([version(2), version(1)]);
    const promise = useVersionStore.getState().loadVersions('d1');
    expect(useVersionStore.getState().isLoading).toBe(true);
    await promise;
    const s = useVersionStore.getState();
    expect(s.isLoading).toBe(false);
    expect(s.versions.map((v) => v.number)).toEqual([2, 1]);
    expect(api.list).toHaveBeenCalledWith('d1');
  });

  it('stores the error message when loading fails', async () => {
    api.list.mockRejectedValue(new Error('boom'));
    await useVersionStore.getState().loadVersions('d1');
    expect(useVersionStore.getState().error).toBe('boom');
    expect(useVersionStore.getState().isLoading).toBe(false);
  });

  it('creates a checkpoint and prepends it', async () => {
    useVersionStore.setState({ versions: [version(1)] });
    api.createCheckpoint.mockResolvedValue(version(2, { label: 'Hito' }));
    const created = await useVersionStore.getState().createCheckpoint('d1', 'Hito');
    expect(created?.number).toBe(2);
    expect(useVersionStore.getState().versions.map((v) => v.number)).toEqual([2, 1]);
    expect(useVersionStore.getState().isWorking).toBe(false);
    expect(api.createCheckpoint).toHaveBeenCalledWith('d1', 'Hito', undefined);
  });

  it('surfaces the server message when creating a checkpoint fails', async () => {
    api.createCheckpoint.mockRejectedValue(new Error('Los visores no pueden crear ni restaurar versiones.'));
    const created = await useVersionStore.getState().createCheckpoint('d1');
    expect(created).toBeNull();
    expect(useVersionStore.getState().error).toMatch(/visores/);
    expect(useVersionStore.getState().isWorking).toBe(false);
  });

  it('selects a version and loads its diff against current', async () => {
    api.diff.mockResolvedValue(diffOf());
    await useVersionStore.getState().selectVersion('d1', 1);
    const s = useVersionStore.getState();
    expect(s.selectedNumber).toBe(1);
    expect(s.diff?.summary).toBe('1 clase agregada');
    expect(api.diff).toHaveBeenCalledWith('d1', 1, 'current');
  });

  it('ignores a stale diff when the selection changed meanwhile', async () => {
    let resolveFirst: (d: VersionDiff) => void = () => {};
    api.diff.mockImplementationOnce(() => new Promise((res) => (resolveFirst = res)));
    api.diff.mockResolvedValueOnce(diffOf(2));
    const first = useVersionStore.getState().selectVersion('d1', 1);
    await useVersionStore.getState().selectVersion('d1', 2);
    resolveFirst(diffOf(1));
    await first;
    expect(useVersionStore.getState().selectedNumber).toBe(2);
    expect(useVersionStore.getState().diff?.to_number).toBe(2);
  });

  it('clears the selection with null', async () => {
    useVersionStore.setState({ selectedNumber: 1, diff: diffOf() });
    await useVersionStore.getState().selectVersion('d1', null);
    expect(useVersionStore.getState().selectedNumber).toBeNull();
    expect(useVersionStore.getState().diff).toBeNull();
    expect(api.diff).not.toHaveBeenCalled();
  });

  it('restores: applies the document, reloads the list and clears the selection', async () => {
    const doc = { id: 'd1', name: 'Demo', version: 5, classes: [], relationships: [] } as unknown as CanonicalUmlDocument;
    const applySpy = vi.fn();
    const original = useDiagramStore.getState().applyRemoteDocument;
    useDiagramStore.setState({ applyRemoteDocument: applySpy });
    api.restore.mockResolvedValue(doc);
    api.list.mockResolvedValue([version(2, { kind: 'PRE_RESTORE' }), version(1)]);
    useVersionStore.setState({ selectedNumber: 1, diff: diffOf() });

    const ok = await useVersionStore.getState().restore('d1', 1);

    useDiagramStore.setState({ applyRemoteDocument: original });
    expect(ok).toBe(true);
    expect(applySpy).toHaveBeenCalledWith(doc);
    const s = useVersionStore.getState();
    expect(s.versions).toHaveLength(2);
    expect(s.selectedNumber).toBeNull();
    expect(s.isWorking).toBe(false);
  });

  it('reports failure when restore is rejected', async () => {
    api.restore.mockRejectedValue(new Error('conflicto'));
    const ok = await useVersionStore.getState().restore('d1', 1);
    expect(ok).toBe(false);
    expect(useVersionStore.getState().error).toBe('conflicto');
    expect(useVersionStore.getState().isWorking).toBe(false);
  });

  it('reset returns the store to its initial state', () => {
    useVersionStore.setState({ versions: [version(1)], isPanelOpen: true, error: 'x', selectedNumber: 1 });
    useVersionStore.getState().reset();
    const s = useVersionStore.getState();
    expect(s.versions).toEqual([]);
    expect(s.isPanelOpen).toBe(false);
    expect(s.error).toBeNull();
    expect(s.selectedNumber).toBeNull();
  });
});
