import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCollaborationStore, mergeChatHistory } from './useCollaborationStore';
import { useDiagramStore } from './useDiagramStore';
import { CanonicalUmlDocument } from '../types/uml';
import type { ChatMessage } from '../types/collaboration';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getChatHistory: vi.fn(),
    getDiagram: vi.fn(),
  },
}));

describe('useCollaborationStore and Real-Time Multi-user Sync', () => {
  beforeEach(() => {
    useCollaborationStore.getState().clearState();
  });

  it('handles room state and user joined/left events', () => {
    const store = useCollaborationStore.getState();

    // 1. Set initial room state
    store.setRoomState([
      {
        user_id: 'usr-prof',
        name: 'Prof. Carlos Mendoza',
        email: 'profesor@case2code.io',
        avatar_color: '#3B82F6',
      },
    ]);

    expect(useCollaborationStore.getState().activeUsers.length).toBe(1);
    expect(useCollaborationStore.getState().activeUsers[0].name).toBe('Prof. Carlos Mendoza');

    // 2. Another user joins
    store.userJoined({
      user_id: 'usr-student',
      name: 'Ana Gómez',
      email: 'estudiante.a@case2code.io',
      avatar_color: '#10B981',
    });

    expect(useCollaborationStore.getState().activeUsers.length).toBe(2);

    // 3. User leaves
    store.userLeft('usr-student');
    expect(useCollaborationStore.getState().activeUsers.length).toBe(1);
    expect(useCollaborationStore.getState().activeUsers[0].user_id).toBe('usr-prof');
  });

  it('updates remote cursors with position and avatar colors', () => {
    const store = useCollaborationStore.getState();

    store.updateRemoteCursor('usr-student', 'Ana Gómez', '#10B981', 250, 420);

    const cursors = useCollaborationStore.getState().remoteCursors;
    expect(cursors['usr-student']).toBeDefined();
    expect(cursors['usr-student'].x).toBe(250);
    expect(cursors['usr-student'].y).toBe(420);
    expect(cursors['usr-student'].avatarColor).toBe('#10B981');
  });

  it('applies remote document updates seamlessly to useDiagramStore', () => {
    const initialDoc: CanonicalUmlDocument = {
      id: 'diag-multiplayer',
      name: 'Multiplayer Diagram',
      version: 1,
      classes: [],
      relationships: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    useDiagramStore.setState({
      currentDocument: initialDoc,
      nodes: [],
      edges: [],
    });

    const updatedDoc: CanonicalUmlDocument = {
      ...initialDoc,
      version: 2,
      classes: [
        {
          id: 'cls-remoto',
          name: 'Pago',
          position: { x: 200, y: 300 },
          attributes: [],
          is_abstract: false,
        },
      ],
    };

    // Apply remote document
    useDiagramStore.getState().applyRemoteDocument(updatedDoc);

    const diagramState = useDiagramStore.getState();
    expect(diagramState.currentDocument?.version).toBe(2);
    expect(diagramState.nodes.length).toBe(1);
    expect(diagramState.nodes[0].id).toBe('cls-remoto');
    expect(diagramState.nodes[0].data.name).toBe('Pago');
  });

  it('manages multiplayer chat messages and typing indicators', () => {
    const store = useCollaborationStore.getState();

    // 1. Initial state
    expect(store.chatMessages.length).toBe(0);
    expect(store.aiMode).toBe('advisory');

    // 2. Set AI mode
    store.setAiMode('pair_programmer');
    expect(useCollaborationStore.getState().aiMode).toBe('pair_programmer');

    // 3. Add user chat message
    store.addChatMessage({
      id: 'msg-1',
      diagram_id: 'diag-multiplayer',
      sender_id: 'usr-prof',
      sender_name: 'Prof. Carlos',
      sender_avatar_color: '#3B82F6',
      sender_type: 'USER',
      content: 'Senior AI, ¿qué opinas de este modelo?',
      created_at: new Date().toISOString(),
    });

    expect(useCollaborationStore.getState().chatMessages.length).toBe(1);

    // 4. Add AI response with speaker targeting
    store.addChatMessage({
      id: 'msg-2',
      diagram_id: 'diag-multiplayer',
      sender_id: 'ai-senior',
      sender_name: 'Senior AI',
      sender_avatar_color: '#8B5CF6',
      sender_type: 'AI',
      content: '@Prof. Carlos, sugiero revisar la relación entre Pago y Reserva.',
      addressed_to: 'Prof. Carlos',
      applied_commands_count: 0,
      created_at: new Date().toISOString(),
    });

    const messages = useCollaborationStore.getState().chatMessages;
    expect(messages.length).toBe(2);
    expect(messages[1].addressed_to).toBe('Prof. Carlos');

    // 5. Test typing indicators
    store.setTypingUser('usr-student', 'Ana Gómez', true);
    expect(useCollaborationStore.getState().typingUsers['usr-student']?.isTyping).toBe(true);

    store.setTypingUser('usr-student', 'Ana Gómez', false);
    expect(useCollaborationStore.getState().typingUsers['usr-student']).toBeUndefined();
  });

  describe('chat updates and history merge', () => {
    const m = (id: string, diagram_id = 'd1', extra: Partial<ChatMessage> = {}): ChatMessage => ({
      id,
      diagram_id,
      sender_id: 'u',
      sender_name: 'U',
      sender_avatar_color: '#000',
      sender_type: 'USER',
      content: id,
      created_at: `2026-01-01T00:00:0${id.length}Z`,
      ...extra,
    });

    beforeEach(() => {
      vi.mocked(api.getChatHistory).mockReset();
    });

    it('updateChatMessage replaces by id and appends unknown messages', () => {
      const store = useCollaborationStore.getState();
      store.addChatMessage(m('a'));
      store.updateChatMessage(m('a', 'd1', { content: 'changed' }));
      store.updateChatMessage(m('bb'));
      const msgs = useCollaborationStore.getState().chatMessages;
      expect(msgs.map((x) => x.id)).toEqual(['a', 'bb']);
      expect(msgs[0].content).toBe('changed');
    });

    it('loadChatHistory keeps messages that arrived over the socket meanwhile', async () => {
      let resolveFetch!: (v: any) => void;
      vi.mocked(api.getChatHistory).mockReturnValue(new Promise((r) => (resolveFetch = r)));
      const pending = useCollaborationStore.getState().loadChatHistory('d1');
      useCollaborationStore.getState().addChatMessage(m('live'));
      resolveFetch({ diagram_id: 'd1', messages: [m('h')] });
      await pending;
      expect(useCollaborationStore.getState().chatMessages.map((x) => x.id)).toEqual(['h', 'live']);
    });

    it('loadChatHistory ignores a stale response for another diagram', async () => {
      let resolveOld!: (v: any) => void;
      vi.mocked(api.getChatHistory)
        .mockReturnValueOnce(new Promise((r) => (resolveOld = r)))
        .mockResolvedValueOnce({ diagram_id: 'd2', messages: [m('new', 'd2')] });
      const old = useCollaborationStore.getState().loadChatHistory('d1');
      await useCollaborationStore.getState().loadChatHistory('d2');
      resolveOld({ diagram_id: 'd1', messages: [m('old', 'd1')] });
      await old;
      expect(useCollaborationStore.getState().chatMessages.map((x) => x.id)).toEqual(['new']);
    });

    it('merge keeps the copy with more resolutions', () => {
      const resolved = m('a', 'd1', {
        resolutions: { hologram: { status: 'APPLIED', by_id: 'u', by_name: 'Ana', at: 'x' } },
      });
      expect(mergeChatHistory([resolved], [m('a')], 'd1')[0].resolutions?.hologram).toBeDefined();
    });
  });
});

