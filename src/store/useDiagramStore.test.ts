import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDiagramStore } from './useDiagramStore';
import { CanonicalUmlDocument } from '../types/uml';
import { api } from '../services/api';
import { useCollaborationStore } from './useCollaborationStore';
import type { ChatMessage } from '../types/collaboration';

vi.mock('../services/api', () => ({
  api: {
    listDiagrams: vi.fn(),
    createDiagram: vi.fn(),
    getDiagram: vi.fn(),
    executeCommand: vi.fn(),
    executeCommandsBatch: vi.fn(),
    resolveProposal: vi.fn(),
    downloadBackendZip: vi.fn(),
    downloadMobileAppZip: vi.fn(),
    sendAssistantPrompt: vi.fn(),
    exportXmi: vi.fn(),
    exportDataDictionary: vi.fn(),
    importXmi: vi.fn(),
    importNewDiagramXmi: vi.fn(),
    getSqlPreview: vi.fn(),
    exportSql: vi.fn(),
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
      hologramCommands: null,
      hologramMessageId: null,
      isApplyingHologram: false,
    });
    useCollaborationStore.getState().clearState();
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

  it('exports data dictionary PDF and stores error on failure', async () => {
    useDiagramStore.setState({ currentDocument: sampleDoc });
    vi.mocked(api.exportDataDictionary).mockResolvedValue(null);

    await useDiagramStore.getState().exportDocs();

    expect(api.exportDataDictionary).toHaveBeenCalledWith('diag-1', 'Peluqueria');
    expect(useDiagramStore.getState().isExportingDocs).toBe(false);

    vi.mocked(api.exportDataDictionary).mockRejectedValue(new Error('boom'));
    await useDiagramStore.getState().exportDocs();

    expect(useDiagramStore.getState().error).toBe('boom');
    expect(useDiagramStore.getState().isExportingDocs).toBe(false);
  });

  it('asks for the AI data dictionary and warns when the AI did not answer', async () => {
    useDiagramStore.setState({ currentDocument: sampleDoc, error: null });
    vi.mocked(api.exportDataDictionary).mockResolvedValue('ai');
    await useDiagramStore.getState().exportDocs(true);
    expect(api.exportDataDictionary).toHaveBeenLastCalledWith('diag-1', 'Peluqueria', true);
    expect(useDiagramStore.getState().error).toBeNull();

    vi.mocked(api.exportDataDictionary).mockResolvedValue('fallback');
    await useDiagramStore.getState().exportDocs(true);
    expect(useDiagramStore.getState().error).toContain('descripciones automáticas');
    expect(useDiagramStore.getState().isExportingDocs).toBe(false);
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

  it('opens and closes the SQL generator and exporter modal', () => {
    expect(useDiagramStore.getState().isSqlModalOpen).toBe(false);
    useDiagramStore.getState().openSqlModal();
    expect(useDiagramStore.getState().isSqlModalOpen).toBe(true);
    useDiagramStore.getState().closeSqlModal();
    expect(useDiagramStore.getState().isSqlModalOpen).toBe(false);
  });

  describe('hologram apply', () => {
    const holoCmds = [
      { command_type: 'CREATE_CLASS', class_id: 'c-new', name: 'Reserva' },
      { command_type: 'CREATE_CLASS', class_id: 'c-bad', name: 'Cliente' },
    ] as never[];
    const docWithReserva: CanonicalUmlDocument = {
      ...sampleDoc,
      version: 2,
      classes: [
        ...sampleDoc.classes,
        { id: 'c-new', name: 'Reserva', position: { x: 300, y: 150 }, attributes: [], is_abstract: false },
      ],
    };
    const chatMessage = { id: 'm1', diagram_id: 'diag-1', sender_type: 'AI' } as ChatMessage;

    beforeEach(() => {
      useDiagramStore.setState({ currentDocument: sampleDoc });
      useDiagramStore.getState().setHologramCommands(holoCmds);
    });

    it('applies through a single batch call and clears the hologram', async () => {
      vi.mocked(api.executeCommandsBatch).mockResolvedValue({
        document: docWithReserva,
        applied: [holoCmds[0], holoCmds[1]],
        skipped: [],
      });

      await useDiagramStore.getState().applyHologram();

      expect(api.executeCommandsBatch).toHaveBeenCalledTimes(1);
      expect(api.executeCommandsBatch).toHaveBeenCalledWith('diag-1', holoCmds);
      const s = useDiagramStore.getState();
      expect(s.currentDocument?.version).toBe(2);
      expect(s.hologramCommands).toBeNull();
      expect(s.isApplyingHologram).toBe(false);
      expect(s.nodes.some((n) => (n.data as any).isHologram)).toBe(false);
    });

    it('syncs the document, clears the hologram and reports skipped commands on partial apply', async () => {
      vi.mocked(api.executeCommandsBatch).mockResolvedValue({
        document: docWithReserva,
        applied: [holoCmds[0]],
        skipped: [{ command: holoCmds[1], reason: 'duplicate' }],
      });

      await useDiagramStore.getState().applyHologram();

      const s = useDiagramStore.getState();
      expect(s.currentDocument?.version).toBe(2);
      expect(s.hologramCommands).toBeNull();
      expect(s.error).toContain('1 cambios');
      expect(s.error).toContain('omitieron 1');
    });

    it('keeps the hologram when nothing could be applied', async () => {
      vi.mocked(api.executeCommandsBatch).mockResolvedValue({
        document: { ...sampleDoc, version: 2 },
        applied: [],
        skipped: [{ command: holoCmds[0], reason: 'x' }, { command: holoCmds[1], reason: 'y' }],
      });

      await useDiagramStore.getState().applyHologram();

      const s = useDiagramStore.getState();
      expect(s.hologramCommands).toEqual(holoCmds);
      expect(s.currentDocument?.version).toBe(2);
      expect(s.error).toContain('omitieron 2');
    });

    it('keeps the hologram on failure and resyncs the document', async () => {
      vi.mocked(api.executeCommandsBatch).mockRejectedValue(new Error('boom'));
      vi.mocked(api.getDiagram).mockResolvedValue({ ...sampleDoc, version: 2 });

      await useDiagramStore.getState().applyHologram();

      const s = useDiagramStore.getState();
      expect(s.hologramCommands).toEqual(holoCmds);
      expect(s.error).toBe('boom');
      expect(api.getDiagram).toHaveBeenCalledWith('diag-1');
      expect(s.currentDocument?.version).toBe(2);
      expect(s.isApplyingHologram).toBe(false);
      // still previewed on the canvas on top of the resynced document
      expect(s.nodes.some((n) => (n.data as any).isHologram)).toBe(true);
    });

    it('ignores a second click while the first apply is running', async () => {
      let release!: (v: any) => void;
      vi.mocked(api.executeCommandsBatch).mockReturnValue(new Promise((r) => (release = r)));

      const first = useDiagramStore.getState().applyHologram();
      expect(useDiagramStore.getState().isApplyingHologram).toBe(true);
      await useDiagramStore.getState().applyHologram();
      release({ document: docWithReserva, applied: holoCmds, skipped: [] });
      await first;

      expect(api.executeCommandsBatch).toHaveBeenCalledTimes(1);
    });

    it('resolves server-side when the hologram came from a chat message', async () => {
      useDiagramStore.getState().setHologramCommands(holoCmds, 'm1');
      expect(useDiagramStore.getState().hologramMessageId).toBe('m1');
      vi.mocked(api.resolveProposal).mockResolvedValue({
        message: {
          ...chatMessage,
          resolutions: { hologram: { status: 'APPLIED', by_id: 'u', by_name: 'Ana', at: 'x', applied_count: 2 } },
        },
        document: docWithReserva,
        applied_count: 2,
        skipped: [],
      });

      await useDiagramStore.getState().applyHologram();

      expect(api.executeCommandsBatch).not.toHaveBeenCalled();
      expect(api.resolveProposal).toHaveBeenCalledWith('diag-1', 'm1', { target: 'hologram', action: 'APPLY' });
      const s = useDiagramStore.getState();
      expect(s.hologramCommands).toBeNull();
      expect(s.hologramMessageId).toBeNull();
      expect(useCollaborationStore.getState().chatMessages.find((m) => m.id === 'm1')?.resolutions?.hologram).toBeDefined();
    });

    it('clears the hologram when the server says somebody already resolved it (409)', async () => {
      useDiagramStore.getState().setHologramCommands(holoCmds, 'm1');
      vi.mocked(api.resolveProposal).mockRejectedValue(
        Object.assign(new Error('resolved'), {
          status: 409,
          body: {
            message: {
              ...chatMessage,
              resolutions: { hologram: { status: 'DISCARDED', by_id: 'u', by_name: 'Ana', at: 'x' } },
            },
          },
        }),
      );
      vi.mocked(api.getDiagram).mockResolvedValue(sampleDoc);

      await useDiagramStore.getState().applyHologram();

      const s = useDiagramStore.getState();
      expect(s.hologramCommands).toBeNull();
      expect(s.error).toBe('Descartado por Ana');
    });

    it('keeps the hologram nodes when a remote or echoed document arrives', () => {
      useDiagramStore.getState().applyRemoteDocument({ ...sampleDoc, version: 2 });
      expect(useDiagramStore.getState().hologramCommands).toEqual(holoCmds);
      expect(useDiagramStore.getState().nodes.some((n) => (n.data as any).isHologram)).toBe(true);
    });

    it('keeps the hologram nodes after dispatching a command', async () => {
      vi.mocked(api.executeCommand).mockResolvedValue({
        success: true,
        version: 2,
        document: { ...sampleDoc, version: 2 },
      });
      await useDiagramStore.getState().dispatchCommand({ command_type: 'MOVE_CLASS', class_id: 'c-1', position: { x: 1, y: 2 } } as never);
      expect(useDiagramStore.getState().nodes.some((n) => (n.data as any).isHologram)).toBe(true);
    });
  });

  describe('version guard for REST responses', () => {
    const named = (version: number, name: string): CanonicalUmlDocument => ({ ...sampleDoc, version, name });

    it('a slow command response does not roll back a newer remote update', async () => {
      useDiagramStore.setState({ currentDocument: sampleDoc });
      let resolveCommand!: (v: { success: boolean; version: number; document: CanonicalUmlDocument }) => void;
      vi.mocked(api.executeCommand).mockReturnValue(
        new Promise((resolve) => {
          resolveCommand = resolve;
        }),
      );

      const pending = useDiagramStore.getState().dispatchCommand({ command_type: 'CREATE_CLASS', name: 'X' } as never);
      useDiagramStore.getState().applyRemoteDocument(named(5, 'remoto-v5')); // WS update arrives first
      resolveCommand({ success: true, version: 3, document: named(3, 'rest-v3') }); // stale REST answer
      await pending;

      expect(useDiagramStore.getState().currentDocument?.version).toBe(5);
      expect(useDiagramStore.getState().currentDocument?.name).toBe('remoto-v5');
    });

    it('ignores an assistant or XMI response for a diagram that is no longer open', async () => {
      useDiagramStore.setState({ currentDocument: { ...sampleDoc, id: 'otro', version: 1 } });
      vi.mocked(api.importXmi).mockResolvedValue(named(9, 'viejo-diagrama'));
      await useDiagramStore.getState().importXmi(new File(['<x/>'], 'a.xmi'));
      expect(useDiagramStore.getState().currentDocument?.id).toBe('otro');
      expect(useDiagramStore.getState().isImportingXmi).toBe(false);
    });

    it('a slower loadDiagram does not overwrite the diagram opened after it', async () => {
      let resolveFirst!: (d: CanonicalUmlDocument) => void;
      vi.mocked(api.getDiagram)
        .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
        .mockResolvedValueOnce({ ...sampleDoc, id: 'segundo', name: 'Segundo' });

      const first = useDiagramStore.getState().loadDiagram('primero');
      await useDiagramStore.getState().loadDiagram('segundo');
      resolveFirst({ ...sampleDoc, id: 'primero', name: 'Primero' });
      await first;

      expect(useDiagramStore.getState().currentDocument?.id).toBe('segundo');
      expect(useDiagramStore.getState().isLoading).toBe(false);
    });
  });

  it('generates and downloads the generic Flutter mobile application zip', async () => {
    useDiagramStore.setState({ currentDocument: sampleDoc });
    vi.mocked(api.downloadMobileAppZip).mockResolvedValue();

    await useDiagramStore.getState().generateMobileApp();

    expect(api.downloadMobileAppZip).toHaveBeenCalledWith('diag-1', 'Peluqueria');
    expect(useDiagramStore.getState().isGeneratingMobile).toBe(false);
  });

  describe('fetchDiagrams & URL deep-linking', () => {
    const docA = { ...sampleDoc, id: 'diag-A', name: 'Diagram A' };
    const docB = { ...sampleDoc, id: 'diag-B', name: 'Diagram B' };

    it('loads targetDiagramId when specified', async () => {
      vi.mocked(api.listDiagrams).mockResolvedValue([docA, docB]);
      vi.mocked(api.getDiagram).mockResolvedValue(docB);

      await useDiagramStore.getState().fetchDiagrams('diag-B');

      expect(api.getDiagram).toHaveBeenCalledWith('diag-B');
      expect(useDiagramStore.getState().currentDocument?.id).toBe('diag-B');
    });

    it('falls back to first diagram in list when targetDiagramId is absent and URL has no query', async () => {
      vi.mocked(api.listDiagrams).mockResolvedValue([docA, docB]);
      vi.mocked(api.getDiagram).mockResolvedValue(docA);

      await useDiagramStore.getState().fetchDiagrams();

      expect(api.getDiagram).toHaveBeenCalledWith('diag-A');
      expect(useDiagramStore.getState().currentDocument?.id).toBe('diag-A');
    });
  });
});


