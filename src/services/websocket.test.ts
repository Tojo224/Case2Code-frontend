import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { collaborationWs } from './websocket';

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
