import { create } from 'zustand';
import {
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
} from '@xyflow/react';
import { CanonicalUmlDocument, UmlClass, UmlCommand, RelationshipType } from '../types/uml';
import { api } from '../services/api';
import { collaborationWs } from '../services/websocket';
import { useCollaborationStore } from './useCollaborationStore';

interface DiagramState {
  currentDocument: CanonicalUmlDocument | null;
  diagramsList: CanonicalUmlDocument[];
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  // Selected elements for inspectors/modals
  selectedClass: UmlClass | null;
  pendingConnection: Connection | null;
  activeRelationType: RelationshipType | null;

  // Actions
  fetchDiagrams: () => Promise<void>;
  createDiagram: (name: string, description?: string) => Promise<void>;
  loadDiagram: (diagramId: string) => Promise<void>;
  dispatchCommand: (command: UmlCommand) => Promise<void>;
  setActiveRelationType: (type: RelationshipType | null) => void;
  
  // Canvas events
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeDragStop: (event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, node: Node) => void;
  onConnect: (connection: Connection) => void;

  setSelectedClass: (cls: UmlClass | null) => void;
  setPendingConnection: (conn: Connection | null) => void;
  clearError: () => void;
  generateBackend: (verify?: boolean) => Promise<void>;

  // AI Assistant
  isAssistantOpen: boolean;
  toggleAssistant: () => void;
  sendAssistantPrompt: (prompt: string) => Promise<any>;

  // Real-Time Collaboration
  applyRemoteDocument: (doc: CanonicalUmlDocument) => void;
  resetDiagrams: () => void;
}

function documentToElements(doc: CanonicalUmlDocument): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = doc.classes.map((cls) => ({
    id: cls.id,
    type: 'umlClass',
    position: { x: cls.position.x, y: cls.position.y },
    data: cls,
  }));

  const edges: Edge[] = doc.relationships.map((rel) => ({
    id: rel.id,
    source: rel.source_class_id,
    target: rel.target_class_id,
    sourceHandle: rel.source_handle || undefined,
    targetHandle: rel.target_handle || undefined,
    type: 'umlRelationship',
    data: rel,
  }));

  return { nodes, edges };
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  currentDocument: null,
  diagramsList: [],
  nodes: [],
  edges: [],
  isLoading: false,
  isGenerating: false,
  error: null,
  selectedClass: null,
  pendingConnection: null,
  activeRelationType: null,

  fetchDiagrams: async () => {
    try {
      set({ isLoading: true, error: null });
      const list = await api.listDiagrams();
      set({ diagramsList: list, isLoading: false });
      if (list.length > 0 && !get().currentDocument) {
        await get().loadDiagram(list[0].id);
      }
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  createDiagram: async (name: string, description?: string) => {
    try {
      set({ isLoading: true, error: null });
      const newDoc = await api.createDiagram(name, description);
      const { nodes, edges } = documentToElements(newDoc);
      set((state) => ({
        currentDocument: newDoc,
        diagramsList: [newDoc, ...state.diagramsList],
        nodes,
        edges,
        isLoading: false,
      }));

      // Connect real-time collaboration
      const token = localStorage.getItem('case2code_token');
      collaborationWs.connect(newDoc.id, token);
      api.getCollaborators(newDoc.id)
        .then((collabs) => useCollaborationStore.getState().setCollaborators(collabs))
        .catch(() => {});
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  loadDiagram: async (diagramId: string) => {
    try {
      set({ isLoading: true, error: null });
      const doc = await api.getDiagram(diagramId);
      const { nodes, edges } = documentToElements(doc);
      set({ currentDocument: doc, nodes, edges, isLoading: false });

      // Connect real-time collaboration
      const token = localStorage.getItem('case2code_token');
      collaborationWs.connect(doc.id, token);
      api.getCollaborators(doc.id)
        .then((collabs) => useCollaborationStore.getState().setCollaborators(collabs))
        .catch(() => {});
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  dispatchCommand: async (command: UmlCommand) => {
    const doc = get().currentDocument;
    if (!doc) return;

    try {
      set({ error: null });
      const res = await api.executeCommand(doc.id, command);
      const { nodes, edges } = documentToElements(res.document);
      
      // Update selectedClass reference if it changed
      const currentSelected = get().selectedClass;
      let updatedSelected: UmlClass | null = null;
      if (currentSelected) {
        updatedSelected = res.document.classes.find((c) => c.id === currentSelected.id) || null;
      }

      set({
        currentDocument: res.document,
        nodes,
        edges,
        selectedClass: updatedSelected,
      });
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  onNodeDragStop: (_event, node) => {
    const doc = get().currentDocument;
    if (!doc) return;
    get().dispatchCommand({
      command_type: 'MOVE_CLASS',
      class_id: node.id,
      position: { x: node.position.x, y: node.position.y },
    }).catch(() => {});
  },

  onConnect: (connection) => {
    if (connection.source && connection.target) {
      let finalConn = connection;
      if (connection.source === connection.target) {
        if (!connection.sourceHandle || !connection.targetHandle || connection.sourceHandle === connection.targetHandle) {
          finalConn = {
            ...connection,
            sourceHandle: 'right-source',
            targetHandle: 'bottom-target',
          };
        }
      }
      set({ pendingConnection: finalConn });
    }
  },

  setActiveRelationType: (type) => set({ activeRelationType: type }),
  setSelectedClass: (cls) => set({ selectedClass: cls }),
  setPendingConnection: (conn) => set({ pendingConnection: conn }),
  clearError: () => set({ error: null }),

  generateBackend: async (verify = false) => {
    const doc = get().currentDocument;
    if (!doc) return;

    try {
      set({ isGenerating: true, error: null });
      await api.downloadBackendZip(doc.id, verify);
      set({ isGenerating: false });
    } catch (e: any) {
      set({ error: e.message, isGenerating: false });
    }
  },

  isAssistantOpen: false,
  toggleAssistant: () => set((state) => ({ isAssistantOpen: !state.isAssistantOpen })),

  sendAssistantPrompt: async (prompt: string) => {
    const doc = get().currentDocument;
    if (!doc) throw new Error('No diagram loaded');

    try {
      set({ error: null });
      const res = await api.sendAssistantPrompt(doc.id, prompt);
      if (res.executed_commands && res.executed_commands.length > 0) {
        const { nodes, edges } = documentToElements(res.document);
        set({
          currentDocument: res.document,
          nodes,
          edges,
        });
      }
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  applyRemoteDocument: (doc: CanonicalUmlDocument) => {
    const currentDoc = get().currentDocument;
    if (!currentDoc || currentDoc.id !== doc.id) return;
    if (doc.version < currentDoc.version) return;

    const { nodes, edges } = documentToElements(doc);
    const currentSelected = get().selectedClass;
    let updatedSelected: UmlClass | null = null;
    if (currentSelected) {
      updatedSelected = doc.classes.find((c) => c.id === currentSelected.id) || null;
    }

    set({
      currentDocument: doc,
      nodes,
      edges,
      selectedClass: updatedSelected,
    });
  },

  resetDiagrams: () => {
    collaborationWs.disconnect();
    useCollaborationStore.getState().clearState();
    set({
      currentDocument: null,
      diagramsList: [],
      nodes: [],
      edges: [],
      selectedClass: null,
      pendingConnection: null,
      activeRelationType: null,
    });
  },
}));

