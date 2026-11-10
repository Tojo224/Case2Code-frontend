import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { WebSocketMessage } from '../types/collaboration';

const WS_POLICY_VIOLATION = 1008;

class CollaborationClient {
  private ws: WebSocket | null = null;
  private currentDiagramId: string | null = null;
  private reconnectTimeout: number | null = null;
  private isIntentionallyClosed = false;
  private lastCursorSend = 0;

  connect(diagramId: string, token?: string | null) {
    // Only skip when the existing socket is alive: a CLOSING/CLOSED socket must be replaced,
    // otherwise the reconnect timer would hit this early return forever.
    const state = this.ws?.readyState;
    const isAlive = state === WebSocket.CONNECTING || state === WebSocket.OPEN;
    if (this.ws && isAlive && this.currentDiagramId === diagramId) {
      return;
    }
    this.disconnect();
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
          diagram.setHologramCommands(msg.message.suggested_commands);
        } else if (msg.message.executed_commands && msg.message.executed_commands.length > 0) {
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

  disconnect() {
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

