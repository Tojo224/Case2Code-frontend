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
    sendAssistantPrompt: vi.fn(),
    exportXmi: vi.fn(),
    importXmi: vi.fn(),
    importNewDiagramXmi: vi.fn(),
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

  it('toggles assistant drawer and sends assistant prompt updating document', async () => {
    expect(useDiagramStore.getState().isAssistantOpen).toBe(false);
    useDiagramStore.getState().toggleAssistant();
    expect(useDiagramStore.getState().isAssistantOpen).toBe(true);

    const updatedDoc: CanonicalUmlDocument = {
      ...sampleDoc,
      version: 3,
      classes: [
        ...sampleDoc.classes,
        {
          id: 'c-3',
          name: 'Vehiculo',
          position: { x: 400, y: 150 },
          attributes: [],
          is_abstract: false,
        },
      ],
    };

    useDiagramStore.setState({ currentDocument: sampleDoc });
    vi.mocked(api.sendAssistantPrompt).mockResolvedValue({
      success: true,
      reply: 'Se creó la clase Vehiculo',
      executed_commands: [
        {
          command_type: 'CREATE_CLASS',
          name: 'Vehiculo',
        },
      ],
      document: updatedDoc,
    });

    const res = await useDiagramStore.getState().sendAssistantPrompt('Crea la clase Vehiculo');
    expect(res.success).toBe(true);
    expect(res.reply).toContain('Vehiculo');

    const state = useDiagramStore.getState();
    expect(state.currentDocument?.version).toBe(3);
    expect(state.nodes.length).toBe(2);
    expect(state.nodes.find((n) => n.id === 'c-3')).toBeDefined();
  });

  it('exports active diagram to Enterprise Architect XMI format', async () => {
    useDiagramStore.setState({ currentDocument: sampleDoc });
    vi.mocked(api.exportXmi).mockResolvedValue();

    await useDiagramStore.getState().exportXmi();

    expect(api.exportXmi).toHaveBeenCalledWith('diag-1', 'Peluqueria');
    expect(useDiagramStore.getState().isExportingXmi).toBe(false);
  });

  it('imports XMI into current diagram and updates nodes and edges', async () => {
    useDiagramStore.setState({ currentDocument: sampleDoc });
    const importedDoc: CanonicalUmlDocument = {
      ...sampleDoc,
      version: 2,
      classes: [
        {
          id: 'c-imported',
          name: 'Habitacion',
          position: { x: 250, y: 100 },
          attributes: [],
          is_abstract: false,
        },
      ],
      relationships: [],
    };
    vi.mocked(api.importXmi).mockResolvedValue(importedDoc);

    const mockFile = new File(['<xmi:XMI></xmi:XMI>'], 'model.xmi', { type: 'application/xml' });
    await useDiagramStore.getState().importXmi(mockFile);

    expect(api.importXmi).toHaveBeenCalledWith('diag-1', mockFile);
    const state = useDiagramStore.getState();
    expect(state.currentDocument?.classes[0].name).toBe('Habitacion');
    expect(state.nodes[0].id).toBe('c-imported');
    expect(state.isImportingXmi).toBe(false);
  });

  it('imports XMI to create a new diagram', async () => {
    const newDoc: CanonicalUmlDocument = {
      ...sampleDoc,
      id: 'diag-imported-new',
      name: 'Hotel Enterprise',
      version: 1,
    };
    vi.mocked(api.importNewDiagramXmi).mockResolvedValue(newDoc);

    const mockFile = new File(['<xmi:XMI></xmi:XMI>'], 'hotel.xmi', { type: 'application/xml' });
    await useDiagramStore.getState().importNewDiagramXmi(mockFile, 'Hotel Enterprise');

    expect(api.importNewDiagramXmi).toHaveBeenCalledWith(mockFile, 'Hotel Enterprise');
    const state = useDiagramStore.getState();
    expect(state.currentDocument?.id).toBe('diag-imported-new');
    expect(state.diagramsList[0].id).toBe('diag-imported-new');
  });
});

