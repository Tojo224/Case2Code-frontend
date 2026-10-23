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
import { CanonicalUmlDocument, UmlClass, UmlCommand, RelationshipType, UmlRelationship } from '../types/uml';
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
  editingRelationship: UmlRelationship | null;
  activeRelationType: RelationshipType | null;
  junctionConfig: { auto: boolean; name: string };
  isCreateClassModalOpen: boolean;
  createClassInitialPosition: { x: number; y: number } | null;

  // Actions
  fetchDiagrams: () => Promise<void>;
  createDiagram: (name: string, description?: string) => Promise<void>;
  loadDiagram: (diagramId: string) => Promise<void>;
  dispatchCommand: (command: UmlCommand) => Promise<void>;
  dispatchCommands: (commands: UmlCommand[]) => Promise<void>;
  setActiveRelationType: (type: RelationshipType | null) => void;
  openCreateClassModal: (position?: { x: number; y: number }) => void;
  closeCreateClassModal: () => void;
  
  // Canvas events
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeDragStop: (event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, node: Node) => void;
  onConnect: (connection: Connection) => void;

  setSelectedClass: (cls: UmlClass | null) => void;
  setPendingConnection: (conn: Connection | null) => void;
  setEditingRelationship: (rel: UmlRelationship | null) => void;
  setJunctionConfig: (config: { auto: boolean; name: string }) => void;
  clearError: () => void;
  generateBackend: (verify?: boolean) => Promise<void>;

  // Enterprise Architect XMI Interchange
  isExportingXmi: boolean;
  isImportingXmi: boolean;
  exportXmi: () => Promise<void>;
  importXmi: (file: File) => Promise<void>;
  importNewDiagramXmi: (file: File, name?: string) => Promise<void>;

  // AI Assistant
  isAssistantOpen: boolean;
  toggleAssistant: () => void;
  sendAssistantPrompt: (
    prompt: string,
    imageData?: { base64: string; mimeType: string }
  ) => Promise<any>;

  // Real-Time Collaboration
  applyRemoteDocument: (doc: CanonicalUmlDocument) => void;
  resetDiagrams: () => void;
}

function getSmartDefaultHandles(
  sourceClass?: UmlClass,
  targetClass?: UmlClass,
  slotIndex: number = 0,
  totalSlots: number = 1
): { sourceHandle: string; targetHandle: string } {
  if (!sourceClass || !targetClass || sourceClass.id === targetClass.id) {
    return { sourceHandle: 'right-source', targetHandle: 'bottom-target' };
  }

  const dx = targetClass.position.x - sourceClass.position.x;
  const dy = targetClass.position.y - sourceClass.position.y;

  // If there's only 1 relationship between the pair, use center handles
  if (totalSlots <= 1) {
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx > 0
        ? { sourceHandle: 'right-source', targetHandle: 'left-target' }
        : { sourceHandle: 'left-source', targetHandle: 'right-target' };
    } else {
      return dy > 0
        ? { sourceHandle: 'bottom-source', targetHandle: 'top-target' }
        : { sourceHandle: 'top-source', targetHandle: 'bottom-target' };
    }
  }

  // If there are multiple relationships between the pair, distribute slots
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) {
      if (slotIndex === 0) return { sourceHandle: 'right-top-source', targetHandle: 'left-top-target' };
      if (slotIndex === 1) return { sourceHandle: 'right-bottom-source', targetHandle: 'left-bottom-target' };
      return { sourceHandle: 'right-source', targetHandle: 'left-target' };
    } else {
      if (slotIndex === 0) return { sourceHandle: 'left-top-source', targetHandle: 'right-top-target' };
      if (slotIndex === 1) return { sourceHandle: 'left-bottom-source', targetHandle: 'right-bottom-target' };
      return { sourceHandle: 'left-source', targetHandle: 'right-target' };
    }
  } else {
    if (dy > 0) {
      if (slotIndex === 0) return { sourceHandle: 'bottom-left-source', targetHandle: 'top-left-target' };
      if (slotIndex === 1) return { sourceHandle: 'bottom-right-source', targetHandle: 'top-right-target' };
      return { sourceHandle: 'bottom-source', targetHandle: 'top-target' };
    } else {
      if (slotIndex === 0) return { sourceHandle: 'top-left-source', targetHandle: 'bottom-left-target' };
      if (slotIndex === 1) return { sourceHandle: 'top-right-source', targetHandle: 'bottom-right-target' };
      return { sourceHandle: 'top-source', targetHandle: 'bottom-target' };
    }
  }
}

function documentToElements(doc: CanonicalUmlDocument): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = doc.classes.map((cls) => ({
    id: cls.id,
    type: 'umlClass',
    position: { x: cls.position.x, y: cls.position.y },
    data: cls,
  }));

  const classMap = new Map(doc.classes.map((c) => [c.id, c]));

  // Count relationships between each pair of classes to distribute slots
  const pairCounts = new Map<string, number>();
  const pairSlots = new Map<string, number>();

  for (const rel of doc.relationships) {
    const key = [rel.source_class_id, rel.target_class_id].sort().join(':::');
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }

  const edges: Edge[] = doc.relationships.map((rel) => {
    const key = [rel.source_class_id, rel.target_class_id].sort().join(':::');
    const totalSlots = pairCounts.get(key) || 1;
    const currentSlot = pairSlots.get(key) || 0;
    pairSlots.set(key, currentSlot + 1);

    let sHandle = rel.source_handle || undefined;
    let tHandle = rel.target_handle || undefined;

    // If handles are missing, assign smart distributed handles
    if (!sHandle || !tHandle) {
      const smart = getSmartDefaultHandles(
        classMap.get(rel.source_class_id),
        classMap.get(rel.target_class_id),
        currentSlot,
        totalSlots
      );
      if (!sHandle) sHandle = smart.sourceHandle;
      if (!tHandle) tHandle = smart.targetHandle;
    }

    return {
      id: rel.id,
      source: rel.source_class_id,
      target: rel.target_class_id,
      sourceHandle: sHandle,
      targetHandle: tHandle,
      type: 'umlRelationship',
      data: rel,
    };
  });

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
  editingRelationship: null,
  activeRelationType: null,
  junctionConfig: { auto: true, name: '' },
  isCreateClassModalOpen: false,
  createClassInitialPosition: null,

  fetchDiagrams: async () => {
    try {
      set({ isLoading: true, error: null });
      const list = await api.listDiagrams();
      set({ diagramsList: list, isLoading: false });
      if (list.length > 0) {
        const currentDoc = get().currentDocument;
        if (!currentDoc || !list.some((d) => d.id === currentDoc.id)) {
          await get().loadDiagram(list[0].id);
        }
      } else {
        // User has no diagrams: clear canvas completely
        get().resetDiagrams();
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

  dispatchCommands: async (commands: UmlCommand[]) => {
    const doc = get().currentDocument;
    if (!doc || commands.length === 0) return;

    try {
      set({ error: null });
      let latestDoc = doc;
      for (const cmd of commands) {
        const res = await api.executeCommand(latestDoc.id, cmd);
        latestDoc = res.document;
      }
      const { nodes, edges } = documentToElements(latestDoc);
      const currentSelected = get().selectedClass;
      let updatedSelected: UmlClass | null = null;
      if (currentSelected) {
        updatedSelected = latestDoc.classes.find((c) => c.id === currentSelected.id) || null;
      }

      set({
        currentDocument: latestDoc,
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

  onConnect: async (connection) => {
    const { activeRelationType, currentDocument, dispatchCommand, junctionConfig } = get();

    // 1. If in pointer mode (no relation tool selected in sidebar), do nothing!
    if (!activeRelationType) {
      return;
    }

    if (!connection.source || !connection.target || !currentDocument) {
      return;
    }

    const sourceClass = currentDocument.classes.find((c) => c.id === connection.source);
    const targetClass = currentDocument.classes.find((c) => c.id === connection.target);
    if (!sourceClass || !targetClass) {
      return;
    }

    const isSelf = connection.source === connection.target;

    // 2. Validation: inheritance/realization cannot be recursive
    if (isSelf && (activeRelationType === 'INHERITANCE' || activeRelationType === 'REALIZATION')) {
      set({ error: 'Una clase no puede heredar o implementar de sí misma.' });
      return;
    }

    // Handles:
    const sourceHandle = isSelf ? 'right-source' : connection.sourceHandle || undefined;
    const targetHandle = isSelf ? 'bottom-target' : connection.targetHandle || undefined;

    // 3. Handle MANY_TO_MANY with junction table
    if (activeRelationType === 'MANY_TO_MANY' && junctionConfig.auto) {
      const jName = (junctionConfig.name.trim() || `${sourceClass.name}_${targetClass.name}`).toLowerCase();
      const jClassId = `cls-${jName.replace(/[^a-zA-Z0-9]/g, '_')}`;

      try {
        const exists = currentDocument.classes.some((c) => c.name.toLowerCase() === jName.toLowerCase());
        if (!exists) {
          const midX = Math.round((sourceClass.position.x + targetClass.position.x) / 2);
          const midY = Math.round((sourceClass.position.y + targetClass.position.y) / 2) + 120;
          await dispatchCommand({
            command_type: 'CREATE_CLASS',
            class_id: jClassId,
            name: jName,
            position: { x: midX, y: midY },
          });

          // Add FK attributes
          await dispatchCommand({
            command_type: 'ADD_ATTRIBUTE',
            class_id: jClassId,
            name: `${sourceClass.name.toLowerCase()}_id`,
            type: 'Long',
            primary_key: false,
            nullable: false,
          });
          await dispatchCommand({
            command_type: 'ADD_ATTRIBUTE',
            class_id: jClassId,
            name: `${targetClass.name.toLowerCase()}_id`,
            type: 'Long',
            primary_key: false,
            nullable: false,
          });

          // Connect source -> junction (1:N)
          await dispatchCommand({
            command_type: 'CREATE_RELATIONSHIP',
            source_class_id: sourceClass.id,
            target_class_id: jClassId,
            type: 'ONE_TO_MANY',
            source_cardinality: '1',
            target_cardinality: '*',
          });

          // Connect target -> junction (1:N)
          await dispatchCommand({
            command_type: 'CREATE_RELATIONSHIP',
            source_class_id: targetClass.id,
            target_class_id: jClassId,
            type: 'ONE_TO_MANY',
            source_cardinality: '1',
            target_cardinality: '*',
          });

          return;
        }
      } catch (err: any) {
        set({ error: err?.message || 'Error al crear tabla intermedia' });
        return;
      }
    }

    // 4. Default cardinalities and roles
    let sourceCard = '1';
    let targetCard = '1';
    let sourceRole: string | undefined = undefined;
    let targetRole: string | undefined = undefined;

    switch (activeRelationType) {
      case 'ONE_TO_MANY':
        sourceCard = '1';
        targetCard = '*';
        break;
      case 'MANY_TO_ONE':
        sourceCard = '*';
        targetCard = '1';
        break;
      case 'ONE_TO_ONE':
        sourceCard = '1';
        targetCard = '1';
        break;
      case 'MANY_TO_MANY':
        sourceCard = '*';
        targetCard = '*';
        break;
      case 'COMPOSITION':
      case 'AGGREGATION':
        sourceCard = '1';
        targetCard = '*';
        break;
      case 'INHERITANCE':
      case 'REALIZATION':
      case 'DEPENDENCY':
        sourceCard = '';
        targetCard = '';
        break;
    }

    if (isSelf) {
      sourceRole = 'subordinados';
      targetRole = 'padre';
    }

    // 5. Dispatch instant relationship creation
    try {
      await dispatchCommand({
        command_type: 'CREATE_RELATIONSHIP',
        source_class_id: sourceClass.id,
        target_class_id: targetClass.id,
        source_handle: sourceHandle,
        target_handle: targetHandle,
        type: activeRelationType,
        source_cardinality: sourceCard,
        target_cardinality: targetCard,
        source_role: sourceRole,
        target_role: targetRole,
      });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already exists')) {
        set({
          error: `Ya existe una relación idéntica entre "${sourceClass.name}" y "${targetClass.name}". Para crear otra, asignales roles distintos con doble clic.`,
        });
      } else {
        set({ error: msg || 'Error al crear la relación' });
      }
    }
  },

  setActiveRelationType: (type) => set({ activeRelationType: type }),
  setSelectedClass: (cls) => set({ selectedClass: cls }),
  setPendingConnection: (conn) => set({ pendingConnection: conn }),
  setEditingRelationship: (rel) => set({ editingRelationship: rel }),
  setJunctionConfig: (config) => set({ junctionConfig: config }),
  clearError: () => set({ error: null }),
  openCreateClassModal: (position) =>
    set({
      isCreateClassModalOpen: true,
      createClassInitialPosition: position || null,
    }),
  closeCreateClassModal: () =>
    set({
      isCreateClassModalOpen: false,
      createClassInitialPosition: null,
    }),

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

  isExportingXmi: false,
  isImportingXmi: false,

  exportXmi: async () => {
    const doc = get().currentDocument;
    if (!doc) return;
    try {
      set({ isExportingXmi: true, error: null });
      await api.exportXmi(doc.id, doc.name);
      set({ isExportingXmi: false });
    } catch (e: any) {
      set({ error: e.message, isExportingXmi: false });
    }
  },

  importXmi: async (file: File) => {
    const doc = get().currentDocument;
    if (!doc) return;
    try {
      set({ isImportingXmi: true, error: null });
      const updatedDoc = await api.importXmi(doc.id, file);
      const { nodes, edges } = documentToElements(updatedDoc);
      set({
        currentDocument: updatedDoc,
        nodes,
        edges,
        isImportingXmi: false,
      });
    } catch (e: any) {
      set({ error: e.message, isImportingXmi: false });
    }
  },

  importNewDiagramXmi: async (file: File, name?: string) => {
    try {
      set({ isImportingXmi: true, error: null });
      const newDoc = await api.importNewDiagramXmi(file, name);
      const { nodes, edges } = documentToElements(newDoc);
      set((state) => ({
        currentDocument: newDoc,
        diagramsList: [newDoc, ...state.diagramsList],
        nodes,
        edges,
        isImportingXmi: false,
      }));

      // Connect real-time collaboration
      const token = localStorage.getItem('case2code_token');
      collaborationWs.connect(newDoc.id, token);
      api.getCollaborators(newDoc.id)
        .then((collabs) => useCollaborationStore.getState().setCollaborators(collabs))
        .catch(() => {});
    } catch (e: any) {
      set({ error: e.message, isImportingXmi: false });
    }
  },

  isAssistantOpen: false,
  toggleAssistant: () => set((state) => ({ isAssistantOpen: !state.isAssistantOpen })),

  sendAssistantPrompt: async (prompt: string, imageData?: { base64: string; mimeType: string }) => {
    const doc = get().currentDocument;
    if (!doc) throw new Error('No diagram loaded');

    try {
      set({ error: null });
      const res = await api.sendAssistantPrompt(doc.id, prompt, imageData);
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
      editingRelationship: null,
      activeRelationType: null,
    });
  },
}));

