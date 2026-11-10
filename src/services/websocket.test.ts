import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { api } from './api';
import { collaborationWs } from './websocket';
import type { ChatMessage } from '../types/collaboration';
import type { CanonicalUmlDocument } from '../types/uml';

vi.mock('./api', () => ({
  api: {
    getDiagram: vi.fn(),
    getChatHistory: vi.fn(),
  },
}));

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  drop(code = 1006) {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code });
  }
}

const RECONNECT_DELAY_MS = 2000;

describe('CollaborationClient reconnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.stubGlobal('window', {
      location: { protocol: 'http:', host: 'localhost' },
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    });
    vi.stubGlobal('localStorage', { getItem: () => 'tok', setItem: () => {}, removeItem: () => {} });
    useCollaborationStore.getState().setConnected(false);
  });

  afterEach(() => {
    collaborationWs.disconnect();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens a new socket after an unexpected close', () => {
    collaborationWs.connect('d1', 'tok');
    FakeWebSocket.instances[0].open();
    expect(useCollaborationStore.getState().isConnected).toBe(true);

    FakeWebSocket.instances[0].drop(1006);
    expect(useCollaborationStore.getState().isConnected).toBe(false);

    vi.advanceTimersByTime(RECONNECT_DELAY_MS);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(FakeWebSocket.instances[1].url).toContain('/api/diagrams/d1/ws');

    FakeWebSocket.instances[1].open();
    expect(useCollaborationStore.getState().isConnected).toBe(true);
  });

  it('keeps retrying while the server stays down', () => {
    collaborationWs.connect('d1', 'tok');
    FakeWebSocket.instances[0].drop(1006);
    vi.advanceTimersByTime(RECONNECT_DELAY_MS);
    FakeWebSocket.instances[1].drop(1006);
    vi.advanceTimersByTime(RECONNECT_DELAY_MS);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('does not reconnect after a policy violation (1008)', () => {
    collaborationWs.connect('d1', 'tok');
    FakeWebSocket.instances[0].open();
    FakeWebSocket.instances[0].drop(1008);
    vi.advanceTimersByTime(RECONNECT_DELAY_MS * 5);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('does not reconnect after an intentional disconnect', () => {
    collaborationWs.connect('d1', 'tok');
    FakeWebSocket.instances[0].open();
    collaborationWs.disconnect();
    vi.advanceTimersByTime(RECONNECT_DELAY_MS * 5);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('reuses a live socket for the same diagram', () => {
    collaborationWs.connect('d1', 'tok');
    FakeWebSocket.instances[0].open();
    collaborationWs.connect('d1', 'tok');
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('ignores late events from a socket that was already replaced', () => {
    collaborationWs.connect('d1', 'tok');
    const stale = FakeWebSocket.instances[0];
    stale.open();

    collaborationWs.connect('d2', 'tok');
    const current = FakeWebSocket.instances[1];
    current.open();
    expect(useCollaborationStore.getState().isConnected).toBe(true);

    stale.drop(1006); // late close of the replaced socket
    vi.advanceTimersByTime(RECONNECT_DELAY_MS * 3);

    expect(useCollaborationStore.getState().isConnected).toBe(true);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});

describe('CollaborationClient resync and chat updates', () => {
  const doc = (version: number): CanonicalUmlDocument => ({
    id: 'd1',
    name: 'D',
    version,
    classes: [],
    relationships: [],
    created_at: '',
    updated_at: '',
  });
  const chatMsg = (partial: Partial<ChatMessage> = {}): ChatMessage => ({
    id: 'm1',
    diagram_id: 'd1',
    sender_id: 'ai-senior',
    sender_name: 'Senior AI',
    sender_avatar_color: '#000',
    sender_type: 'AI',
    content: 'hola',
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.clearAllMocks();
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.stubGlobal('window', {
      location: { protocol: 'http:', host: 'localhost' },
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    });
    vi.stubGlobal('localStorage', { getItem: () => 'tok', setItem: () => {}, removeItem: () => {} });
    useCollaborationStore.getState().clearState();
    useDiagramStore.setState({ currentDocument: doc(1), nodes: [], edges: [], hologramCommands: null, hologramMessageId: null });
    vi.mocked(api.getDiagram).mockResolvedValue(doc(5));
    vi.mocked(api.getChatHistory).mockResolvedValue({ diagram_id: 'd1', messages: [chatMsg({ id: 'h1' })] });
  });

  afterEach(() => {
    collaborationWs.disconnect();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not resync on the first connect', async () => {
    collaborationWs.connect('d1', 'tok');
    FakeWebSocket.instances[0].open();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.getDiagram).not.toHaveBeenCalled();
    expect(api.getChatHistory).not.toHaveBeenCalled();
  });

  it('refetches the document and chat after a reconnect', async () => {
    collaborationWs.connect('d1', 'tok');
    FakeWebSocket.instances[0].open();
    FakeWebSocket.instances[0].drop(1006);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);
    FakeWebSocket.instances[1].open();
    await vi.advanceTimersByTimeAsync(0);

    expect(api.getDiagram).toHaveBeenCalledWith('d1');
    expect(api.getChatHistory).toHaveBeenCalledWith('d1');
    expect(useDiagramStore.getState().currentDocument?.version).toBe(5);
    expect(useCollaborationStore.getState().chatMessages.map((m) => m.id)).toEqual(['h1']);
  });

  it('does not resync after an intentional disconnect and a fresh connect', async () => {
    collaborationWs.connect('d1', 'tok');
    FakeWebSocket.instances[0].open();
    collaborationWs.disconnect();
    collaborationWs.connect('d1', 'tok');
    FakeWebSocket.instances[1].open();
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS * 3);
    expect(api.getDiagram).not.toHaveBeenCalled();
  });

  it('replaces a chat message on CHAT_MESSAGE_UPDATED and clears its hologram', () => {
    collaborationWs.connect('d1', 'tok');
    const ws = FakeWebSocket.instances[0];
    ws.open();
    const holo = [{ command_type: 'CREATE_CLASS', name: 'X' }] as never[];
    const proposal = chatMsg({ suggested_commands: holo });
    ws.onmessage?.({ data: JSON.stringify({ type: 'CHAT_MESSAGE', diagram_id: 'd1', message: proposal }) });
    expect(useDiagramStore.getState().hologramMessageId).toBe('m1');

    const resolved = chatMsg({
      suggested_commands: holo,
      resolutions: { hologram: { status: 'APPLIED', by_id: 'u', by_name: 'Ana', at: 'x' } },
    });
    ws.onmessage?.({ data: JSON.stringify({ type: 'CHAT_MESSAGE_UPDATED', diagram_id: 'd1', message: resolved }) });

    const msgs = useCollaborationStore.getState().chatMessages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].resolutions?.hologram.by_name).toBe('Ana');
    expect(useDiagramStore.getState().hologramCommands).toBeNull();
    expect(useDiagramStore.getState().hologramMessageId).toBeNull();
  });
});
