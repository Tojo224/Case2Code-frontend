import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { WebSocketMessage } from '../types/collaboration';

class CollaborationClient {
  private ws: WebSocket | null = null;
  private currentDiagramId: string | null = null;
  private reconnectTimeout: number | null = null;
  private isIntentionallyClosed = false;
  private lastCursorSend = 0;

  connect(diagramId: string, token?: string | null) {
    if (this.ws && this.currentDiagramId === diagramId) {
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
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        useCollaborationStore.getState().setConnected(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {
          // ignore parsing error
        }
      };

      this.ws.onclose = () => {
        useCollaborationStore.getState().setConnected(false);
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
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
      case 'PING':
        this.send({ type: 'PONG' });
        break;
    }
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

