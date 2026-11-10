import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUndoStore, MAX_UNDO } from './useUndoStore';
import { useDiagramStore } from './useDiagramStore';
import { api } from '../services/api';
import type { CanonicalUmlDocument, UmlCommand } from '../types/uml';

vi.mock('../services/api', () => ({
  api: {
    executeCommand: vi.fn(),
    getDiagram: vi.fn(),
    getCollaborators: vi.fn(),
  },
}));

const doc = (version: number): CanonicalUmlDocument => ({
  id: 'd1',
  name: 'D',
  version,
  classes: [],
  relationships: [],
  created_at: '',
  updated_at: '',
});

const cmd = (n: number): UmlCommand => ({ command_type: 'DELETE_CLASS', class_id: `c${n}` });
const entry = (n: number) => ({ label: `E${n}`, undo: [cmd(n)], redo: [cmd(n + 100)] });
const stacks = () => useUndoStore.getState().stacks['d1'];

describe('useUndoStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUndoStore.getState().clear();
    useDiagramStore.setState({ currentDocument: doc(1), nodes: [], edges: [] });
  });

  it('caps the stack at 50, dropping the oldest', () => {
    for (let i = 0; i < 55; i++) useUndoStore.getState().record('d1', entry(i));
    expect(stacks().undoStack).toHaveLength(MAX_UNDO);
    expect(stacks().undoStack[0].label).toBe('E5');
  });

  it('record clears the redo stack', async () => {
    (api.executeCommand as any).mockResolvedValue({ document: doc(2) });
    useUndoStore.getState().record('d1', entry(1));
    await useUndoStore.getState().undo();
    expect(stacks().redoStack).toHaveLength(1);
    useUndoStore.getState().record('d1', entry(2));
    expect(stacks().redoStack).toHaveLength(0);
  });

  it('undo and redo move entries between stacks and call the api in order', async () => {
    (api.executeCommand as any).mockResolvedValue({ document: doc(2) });
    useUndoStore.getState().record('d1', { label: 'X', undo: [cmd(1), cmd(2)], redo: [cmd(3)] });
    await useUndoStore.getState().undo();
    expect(api.executeCommand).toHaveBeenNthCalledWith(1, 'd1', cmd(1));
    expect(api.executeCommand).toHaveBeenNthCalledWith(2, 'd1', cmd(2));
    expect(stacks().undoStack).toHaveLength(0);
    expect(stacks().redoStack).toHaveLength(1);
    await useUndoStore.getState().redo();
    expect(api.executeCommand).toHaveBeenLastCalledWith('d1', cmd(3));
    expect(stacks().undoStack).toHaveLength(1);
    expect(stacks().redoStack).toHaveLength(0);
    expect(useUndoStore.getState().isReplaying).toBe(false);
  });

  it('api failure discards the entry and leaves a notice', async () => {
    (api.executeCommand as any).mockRejectedValue(new Error('boom'));
    useUndoStore.getState().record('d1', entry(1));
    await useUndoStore.getState().undo();
    expect(stacks().undoStack).toHaveLength(0);
    expect(stacks().redoStack).toHaveLength(0);
    expect(useUndoStore.getState().notice).toContain('No se pudo deshacer');
  });
});
