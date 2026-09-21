import { create } from 'zustand';
import { AuthResponse, User } from '../types/collaboration';

interface AuthState {
  currentUser: User | null;
  token: string | null;
  demoUsers: AuthResponse[];
  isLoading: boolean;
  error: string | null;

  loadSession: () => Promise<void>;
  switchUser: (auth: AuthResponse) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, avatarColor?: string) => Promise<boolean>;
  logout: () => void;
}

const STORAGE_KEY_TOKEN = 'case2code_token';
const STORAGE_KEY_USER = 'case2code_user';

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  token: null,
  demoUsers: [],
  isLoading: false,
  error: null,

  loadSession: async () => {
    set({ isLoading: true, error: null });
    try {
      // 1. Fetch available demo users from backend
      const res = await fetch('/api/auth/demo-users');
      let demos: AuthResponse[] = [];
      if (res.ok) {
        demos = await res.json();
        set({ demoUsers: demos });
      }

      // 2. Check localStorage for existing session
      const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      const savedUserStr = localStorage.getItem(STORAGE_KEY_USER);

      if (savedToken && savedUserStr) {
        try {
          const user = JSON.parse(savedUserStr);
          set({ currentUser: user, token: savedToken, isLoading: false });
          return;
        } catch {
          // ignore parsing error
        }
      }

      // 3. If no session stored, remain logged out
      set({ currentUser: null, token: null, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  switchUser: (auth: AuthResponse) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, auth.access_token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(auth.user));
    set({ currentUser: auth.user, token: auth.access_token });
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(errData.detail || 'Login failed');
      }
      const data: AuthResponse = await res.json();
      localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
      set({ currentUser: data.user, token: data.access_token, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  register: async (name: string, email: string, password: string, avatarColor?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, avatar_color: avatarColor }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(errData.detail || 'Registration failed');
      }
      const data: AuthResponse = await res.json();
      localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
      set({ currentUser: data.user, token: data.access_token, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    set({ currentUser: null, token: null });
  },
}));
