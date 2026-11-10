import { create } from 'zustand';
import { api } from '../services/api';
import type { UmlCommand } from '../types/uml';
import { useDiagramStore } from './useDiagramStore';
import type { InverseEntry } from './undoLogic';

export const MAX_UNDO = 50;
const FAIL_NOTICE_UNDO = 'No se pudo deshacer: el elemento cambió desde que lo hiciste.';
const FAIL_NOTICE_REDO = 'No se pudo rehacer: el elemento cambió desde que lo hiciste.';

interface Stacks {
  undoStack: InverseEntry[];
  redoStack: InverseEntry[];
}

interface UndoState {
  stacks: Record<string, Stacks>;
  isReplaying: boolean;
  notice: string | null;
  lastToast: { label: string; id: number } | null;
  record: (diagramId: string, entry: InverseEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;
  dismissToast: () => void;
  clearNotice: () => void;
}

let toastSeq = 0;
const empty: Stacks = { undoStack: [], redoStack: [] };

export const useUndoStore = create<UndoState>((set, get) => {
  const replay = async (kind: 'undo' | 'redo') => {
    if (get().isReplaying) return;
    const doc = useDiagramStore.getState().currentDocument;
    if (!doc) return;
    const stacks = get().stacks[doc.id] ?? empty;
    const from = kind === 'undo' ? stacks.undoStack : stacks.redoStack;
    if (from.length === 0) return;
    const entry = from[from.length - 1];
    const cmds: UmlCommand[] = kind === 'undo' ? entry.undo : entry.redo;

    set({ isReplaying: true, notice: null });
    try {
      let latest = doc;
      for (const cmd of cmds) {
        const res = await api.executeCommand(doc.id, cmd);
        latest = res.document;
      }
      useDiagramStore.getState().applyRemoteDocument(latest);
      set((s) => {
        const cur = s.stacks[doc.id] ?? empty;
        const next: Stacks =
          kind === 'undo'
            ? { undoStack: cur.undoStack.slice(0, -1), redoStack: [...cur.redoStack, entry] }
            : { undoStack: [...cur.undoStack, entry], redoStack: cur.redoStack.slice(0, -1) };
        return { stacks: { ...s.stacks, [doc.id]: next }, lastToast: null };
      });
    } catch {
      set((s) => {
        const cur = s.stacks[doc.id] ?? empty;
        const next: Stacks =
          kind === 'undo'
            ? { ...cur, undoStack: cur.undoStack.slice(0, -1) }
            : { ...cur, redoStack: cur.redoStack.slice(0, -1) };
        return {
          stacks: { ...s.stacks, [doc.id]: next },
          notice: kind === 'undo' ? FAIL_NOTICE_UNDO : FAIL_NOTICE_REDO,
          lastToast: null,
        };
      });
    } finally {
      set({ isReplaying: false });
    }
  };

  return {
    stacks: {},
    isReplaying: false,
    notice: null,
    lastToast: null,
    record: (diagramId, entry) => {
      if (get().isReplaying) return;
      set((s) => {
        const cur = s.stacks[diagramId] ?? empty;
        const undoStack = [...cur.undoStack, entry].slice(-MAX_UNDO);
        return {
          stacks: { ...s.stacks, [diagramId]: { undoStack, redoStack: [] } },
          lastToast: { label: entry.label, id: ++toastSeq },
        };
      });
    },
    undo: () => replay('undo'),
    redo: () => replay('redo'),
    clear: () => set({ stacks: {}, notice: null, lastToast: null }),
    dismissToast: () => set({ lastToast: null }),
    clearNotice: () => set({ notice: null }),
  };
});
