import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDiagramStore } from './useDiagramStore';
import { CanonicalUmlDocument } from '../types/uml';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    listDiagrams: vi.fn(),
    createDiagram: vi.fn(),
    getDiagram: vi.fn(),
    executeCommand: vi.fn(),
    downloadBackendZip: vi.fn(),
  },
}));

describe('useDiagramStore', () => {
  const sampleDoc: CanonicalUmlDocument = {
    id: 'diag-1',
    name: 'Peluqueria',
    description: 'Test diagram',
    version: 1,
    classes: [
      {
        id: 'c-1',
        name: 'Cliente',
        position: { x: 100, y: 150 },
        attributes: [
          {
            id: 'a-1',
            name: 'id',
            type: 'Long',
            primary_key: true,
            nullable: false,
            visibility: 'PRIVATE',
          },
        ],
        is_abstract: false,
      },
    ],
    relationships: [
      {
        id: 'r-1',
        name: 'rel',
        type: 'ONE_TO_MANY',
        source_class_id: 'c-1',
        target_class_id: 'c-2',
        source_cardinality: '1',
        target_cardinality: '*',
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useDiagramStore.setState({
      currentDocument: null,
      diagramsList: [],
      nodes: [],
      edges: [],
      isLoading: false,
      error: null,
    });
  });

  it('loads a diagram and creates corresponding nodes and edges', async () => {
    vi.mocked(api.getDiagram).mockResolvedValue(sampleDoc);

    await useDiagramStore.getState().loadDiagram('diag-1');

    const state = useDiagramStore.getState();
    expect(state.currentDocument?.id).toBe('diag-1');
    expect(state.nodes.length).toBe(1);
    expect(state.nodes[0].id).toBe('c-1');
    expect(state.nodes[0].position).toEqual({ x: 100, y: 150 });
    expect(state.edges.length).toBe(1);
    expect(state.edges[0].id).toBe('r-1');
  });

  it('dispatches a typed command and updates state with new version', async () => {
    const updatedDoc: CanonicalUmlDocument = {
      ...sampleDoc,
      version: 2,
      classes: [
        ...sampleDoc.classes,
        {
          id: 'c-2',
          name: 'Reserva',
          position: { x: 300, y: 150 },
          attributes: [],
          is_abstract: false,
        },
      ],
    };

    useDiagramStore.setState({ currentDocument: sampleDoc });
    vi.mocked(api.executeCommand).mockResolvedValue({
      success: true,
      version: 2,
      document: updatedDoc,
    });

    await useDiagramStore.getState().dispatchCommand({
      command_type: 'CREATE_CLASS',
      name: 'Reserva',
    });

    const state = useDiagramStore.getState();
    expect(state.currentDocument?.version).toBe(2);
    expect(state.nodes.length).toBe(2);
    expect(state.nodes.find((n) => n.id === 'c-2')).toBeDefined();
  });
});
