import { create } from 'zustand';
import { ProjectCollaborator, UserPresence } from '../types/collaboration';

export interface RemoteCursor {
  userId: string;
  name: string;
  avatarColor: string;
  x: number;
  y: number;
  lastSeen: number;
}

interface CollaborationState {
  isConnected: boolean;
  activeUsers: UserPresence[];
  remoteCursors: Record<string, RemoteCursor>;
  remoteSelections: Record<string, string | null>;
  collaborators: ProjectCollaborator[];
  isInviteModalOpen: boolean;
  isAuthModalOpen: boolean;

  setConnected: (connected: boolean) => void;
  setRoomState: (users: UserPresence[]) => void;
  userJoined: (user: UserPresence) => void;
  userLeft: (userId: string) => void;
  updateRemoteCursor: (userId: string, name: string, color: string, x: number, y: number) => void;
  updateRemoteSelection: (userId: string, classId: string | null) => void;
  setCollaborators: (collaborators: ProjectCollaborator[]) => void;
  setInviteModalOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
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

      return {
        activeUsers: state.activeUsers.filter((u) => u.user_id !== userId),
        remoteCursors: newCursors,
        remoteSelections: newSelections,
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

  clearState: () =>
    set({
      isConnected: false,
      activeUsers: [],
      remoteCursors: {},
      remoteSelections: {},
      collaborators: [],
    }),
}));
