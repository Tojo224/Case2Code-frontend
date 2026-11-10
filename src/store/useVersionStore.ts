import { create } from 'zustand';
import { versionsApi } from '../services/versionsApi';
import type { DiagramVersion, VersionDiff } from '../types/versions';
import { useDiagramStore } from './useDiagramStore';

// CONTRACT: other modules (assistant chat, tutorial) rely on these field and action names.
// Agent A owns this file and may extend it, not rename existing members.

interface VersionState {
  versions: DiagramVersion[];
  isPanelOpen: boolean;
  isLoading: boolean;
  isWorking: boolean; // creating a checkpoint or restoring
  error: string | null;
  selectedNumber: number | null;
  diff: VersionDiff | null;

  openPanel: () => void;
  closePanel: () => void;
  loadVersions: (diagramId: string) => Promise<void>;
  createCheckpoint: (diagramId: string, label?: string, message?: string) => Promise<DiagramVersion | null>;
  selectVersion: (diagramId: string, number: number | null) => Promise<void>;
  restore: (diagramId: string, number: number) => Promise<boolean>;
  reset: () => void;
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],
  isPanelOpen: false,
  isLoading: false,
  isWorking: false,
  error: null,
  selectedNumber: null,
  diff: null,

  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),

  loadVersions: async (diagramId) => {
    set({ isLoading: true, error: null });
    try {
      const versions = await versionsApi.list(diagramId);
      set({ versions, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  createCheckpoint: async (diagramId, label, message) => {
    set({ isWorking: true, error: null });
    try {
      const created = await versionsApi.createCheckpoint(diagramId, label, message);
      set((s) => ({ versions: [created, ...s.versions], isWorking: false }));
      return created;
    } catch (e) {
      set({ isWorking: false, error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  selectVersion: async (diagramId, number) => {
    if (number === null) {
      set({ selectedNumber: null, diff: null });
      return;
    }
    set({ selectedNumber: number, diff: null, error: null });
    try {
      const diff = await versionsApi.diff(diagramId, number, 'current');
      if (get().selectedNumber === number) set({ diff });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  restore: async (diagramId, number) => {
    set({ isWorking: true, error: null });
    try {
      const doc = await versionsApi.restore(diagramId, number);
      useDiagramStore.getState().applyRemoteDocument(doc);
      await get().loadVersions(diagramId);
      set({ isWorking: false, selectedNumber: null, diff: null });
      return true;
    } catch (e) {
      set({ isWorking: false, error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  reset: () =>
    set({
      versions: [],
      isPanelOpen: false,
      isLoading: false,
      isWorking: false,
      error: null,
      selectedNumber: null,
      diff: null,
    }),
}));
