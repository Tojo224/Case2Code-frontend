import { create } from 'zustand';
import { ChatMessage, ProjectCollaborator, UserPresence } from '../types/collaboration';
import { api } from '../services/api';

export interface RemoteCursor {
  userId: string;
  name: string;
  avatarColor: string;
  x: number;
  y: number;
  lastSeen: number;
}

export type AiColleagueMode = 'advisory' | 'pair_programmer';

interface CollaborationState {
  isConnected: boolean;
  activeUsers: UserPresence[];
  remoteCursors: Record<string, RemoteCursor>;
  remoteSelections: Record<string, string | null>;
  collaborators: ProjectCollaborator[];
  isInviteModalOpen: boolean;
  isAuthModalOpen: boolean;

  // Senior AI & Group Chat State
  chatMessages: ChatMessage[];
  typingUsers: Record<string, { userName: string; isTyping: boolean }>;
  aiMode: AiColleagueMode;

  setConnected: (connected: boolean) => void;
  setRoomState: (users: UserPresence[]) => void;
  userJoined: (user: UserPresence) => void;
  userLeft: (userId: string) => void;
  updateRemoteCursor: (userId: string, name: string, color: string, x: number, y: number) => void;
  updateRemoteSelection: (userId: string, classId: string | null) => void;
  setCollaborators: (collaborators: ProjectCollaborator[]) => void;
  setInviteModalOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;

  // Chat Actions
  setAiMode: (mode: AiColleagueMode) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setChatMessages: (msgs: ChatMessage[]) => void;
  setTypingUser: (userId: string, userName: string, isTyping: boolean) => void;
  loadChatHistory: (diagramId: string) => Promise<void>;

  clearState: () => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  isConnected: false,
  activeUsers: [],
  remoteCursors: {},
  remoteSelections: {},
  collaborators: [],
  isInviteModalOpen: false,
  isAuthModalOpen: false,

  chatMessages: [],
  typingUsers: {},
  aiMode: 'advisory',

  setConnected: (connected) => set({ isConnected: connected }),

  setRoomState: (users) =>
    set({
      activeUsers: users,
      remoteCursors: {},
    }),

  userJoined: (user) =>
    set((state) => {
      const exists = state.activeUsers.some((u) => u.user_id === user.user_id);
      if (exists) {
        return {
          activeUsers: state.activeUsers.map((u) => (u.user_id === user.user_id ? user : u)),
        };
      }
      return { activeUsers: [...state.activeUsers, user] };
    }),

  userLeft: (userId) =>
    set((state) => {
      const newCursors = { ...state.remoteCursors };
      delete newCursors[userId];
      const newSelections = { ...state.remoteSelections };
      delete newSelections[userId];
      const newTyping = { ...state.typingUsers };
      delete newTyping[userId];

      return {
        activeUsers: state.activeUsers.filter((u) => u.user_id !== userId),
        remoteCursors: newCursors,
        remoteSelections: newSelections,
        typingUsers: newTyping,
      };
    }),

  updateRemoteCursor: (userId, name, color, x, y) =>
    set((state) => ({
      remoteCursors: {
        ...state.remoteCursors,
        [userId]: {
          userId,
          name,
          avatarColor: color,
          x,
          y,
          lastSeen: Date.now(),
        },
      },
    })),

  updateRemoteSelection: (userId, classId) =>
    set((state) => ({
      remoteSelections: {
        ...state.remoteSelections,
        [userId]: classId,
      },
    })),

  setCollaborators: (collaborators) => set({ collaborators }),
  setInviteModalOpen: (open) => set({ isInviteModalOpen: open }),
  setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),

  setAiMode: (mode) => set({ aiMode: mode }),

  addChatMessage: (msg) =>
    set((state) => {
      // Prevent duplicate messages if already present
      if (state.chatMessages.some((m) => m.id === msg.id)) {
        return state;
      }
      return { chatMessages: [...state.chatMessages, msg] };
    }),

  setChatMessages: (msgs) => set({ chatMessages: msgs }),

  setTypingUser: (userId, userName, isTyping) =>
    set((state) => {
      const updated = { ...state.typingUsers };
      if (!isTyping) {
        delete updated[userId];
      } else {
        updated[userId] = { userName, isTyping: true };
      }
      return { typingUsers: updated };
    }),

  loadChatHistory: async (diagramId: string) => {
    try {
      const res = await api.getChatHistory(diagramId);
      if (res && Array.isArray(res.messages)) {
        set({ chatMessages: res.messages });
      }
    } catch (e) {
      console.warn('Could not load chat history:', e);
    }
  },

  clearState: () =>
    set({
      isConnected: false,
      activeUsers: [],
      remoteCursors: {},
      remoteSelections: {},
      collaborators: [],
      chatMessages: [],
      typingUsers: {},
    }),
}));

