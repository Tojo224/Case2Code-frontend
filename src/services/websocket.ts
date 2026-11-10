import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { WebSocketMessage } from '../types/collaboration';
import { api } from './api';
import { HOLOGRAM_RESOLUTION_KEY } from '../components/assistant/aiProposals';

const WS_POLICY_VIOLATION = 1008;

class CollaborationClient {
  private ws: WebSocket | null = null;
  private currentDiagramId: string | null = null;
  private reconnectTimeout: number | null = null;
  private isIntentionallyClosed = false;
  private lastCursorSend = 0;
  // Diagram whose socket has opened at least once since the last intentional disconnect.
  private openedDiagramId: string | null = null;

  connect(diagramId: string, token?: string | null) {
    // Only skip when the existing socket is alive: a CLOSING/CLOSED socket must be replaced,
    // otherwise the reconnect timer would hit this early return forever.
    const state = this.ws?.readyState;
    const isAlive = state === WebSocket.CONNECTING || state === WebSocket.OPEN;
    if (this.ws && isAlive && this.currentDiagramId === diagramId) {
      return;
    }
    this.teardown();
    this.isIntentionallyClosed = false;
    this.currentDiagramId = diagramId;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const wsUrl = `${protocol}//${host}/api/diagrams/${diagramId}/ws${tokenQuery}`;

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;
      // Events of a socket that was already replaced (diagram switch, manual reconnect)
      // must not touch the shared state or schedule reconnects.
      const isCurrent = () => this.ws === socket;

      socket.onopen = () => {
        if (!isCurrent()) return;
        useCollaborationStore.getState().setConnected(true);
        // A re-open of the same diagram means we were offline: catch up on what we missed.
        const isReopen = this.openedDiagramId === diagramId;
        this.openedDiagramId = diagramId;
        if (isReopen) void this.resync(diagramId);
      };

      socket.onmessage = (event) => {
        if (!isCurrent()) return;
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {
          // ignore parsing error
        }
      };

      socket.onclose = (event) => {
        if (!isCurrent()) return;
        this.ws = null;
        useCollaborationStore.getState().setConnected(false);
        // 1008 = policy violation (no access / expired token): retrying would loop forever.
        if (!this.isIntentionallyClosed && event.code !== WS_POLICY_VIOLATION) {
          this.scheduleReconnect();
        }
      };

      socket.onerror = () => {
        if (!isCurrent()) return;
        useCollaborationStore.getState().setConnected(false);
      };
    } catch {
      useCollaborationStore.getState().setConnected(false);
    }
  }

  private handleMessage(msg: WebSocketMessage) {
    const collab = useCollaborationStore.getState();
    const diagram = useDiagramStore.getState();

    switch (msg.type) {
      case 'ROOM_STATE':
        collab.setRoomState(msg.users);
        break;
      case 'USER_JOINED':
        collab.userJoined(msg.user);
        break;
      case 'USER_LEFT':
        collab.userLeft(msg.user_id);
        break;
      case 'CURSOR_MOVE':
        collab.updateRemoteCursor(msg.user_id, msg.name, msg.avatar_color, msg.x, msg.y);
        break;
      case 'SELECTION_CHANGE':
        collab.updateRemoteSelection(msg.user_id, msg.selected_class_id || null);
        break;
      case 'DOCUMENT_UPDATED':
        diagram.applyRemoteDocument(msg.document);
        break;
      case 'CHAT_MESSAGE':
        collab.addChatMessage(msg.message);
        if (msg.message.suggested_commands && msg.message.suggested_commands.length > 0) {
          diagram.setHologramCommands(msg.message.suggested_commands, msg.message.id);
        } else if (msg.message.executed_commands && msg.message.executed_commands.length > 0) {
          diagram.clearHologram();
        }
        break;
      case 'CHAT_MESSAGE_UPDATED':
        collab.updateChatMessage(msg.message);
        // Somebody applied or discarded the proposal behind the visible hologram.
        if (
          diagram.hologramMessageId === msg.message.id &&
          msg.message.resolutions?.[HOLOGRAM_RESOLUTION_KEY]
        ) {
          diagram.clearHologram();
        }
        break;
      case 'TYPING_INDICATOR':
        collab.setTypingUser(msg.user_id, msg.user_name, msg.is_typing);
        break;
      case 'PING':
        this.send({ type: 'PONG' });
        break;
    }
  }

  // forceAi: the sender is addressing the AI directly (assistant panel). Without it the backend
  // only wakes the AI on an explicit mention (@ai, @senior, @bot, /ai).
  sendChatMessage(content: string, aiMode: string = 'advisory', forceAi: boolean = false) {
    this.send({
      type: 'SEND_CHAT_MESSAGE',
      content,
      ai_mode: aiMode,
      force_ai: forceAi,
    });
  }

  setTyping(isTyping: boolean) {
    this.send({
      type: 'SET_TYPING',
      is_typing: isTyping,
    });
  }

  sendCursor(x: number, y: number) {
    const now = performance.now();
    if (now - this.lastCursorSend < 35) return; // throttle at ~30fps
    this.lastCursorSend = now;

    this.send({
      type: 'CURSOR_MOVE',
      x,
      y,
    });
  }

  sendSelection(selectedClassId: string | null) {
    this.send({
      type: 'SELECTION_CHANGE',
      selected_class_id: selectedClassId,
    });
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /** Refetches the document and chat that were missed while the socket was down. */
  private async resync(diagramId: string) {
    try {
      const doc = await api.getDiagram(diagramId);
      if (this.currentDiagramId === diagramId) {
        useDiagramStore.getState().applyRemoteDocument(doc);
      }
    } catch {
      // the next DOCUMENT_UPDATED or reconnect will catch up
    }
    if (this.currentDiagramId === diagramId) {
      await useCollaborationStore.getState().loadChatHistory(diagramId);
    }
  }

  disconnect() {
    this.teardown();
    // After an intentional disconnect the next open is a fresh start, not a reconnect.
    this.openedDiagramId = null;
  }

  private teardown() {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    useCollaborationStore.getState().setConnected(false);
    this.currentDiagramId = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.currentDiagramId && !this.isIntentionallyClosed) {
        const token = localStorage.getItem('case2code_token');
        this.connect(this.currentDiagramId, token);
      }
    }, 2000);
  }
}

export const collaborationWs = new CollaborationClient();

