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
  forgotPassword: (email: string) => Promise<{ ok: boolean; message: string; devToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ ok: boolean; message: string }>;
  clearError: () => void;
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

  clearError: () => set({ error: null }),

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

      // 2. Check localStorage for existing session and verify token with /api/auth/me
      const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      const savedUserStr = localStorage.getItem(STORAGE_KEY_USER);

      if (savedToken && savedUserStr) {
        try {
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (meRes.ok) {
            const verifiedUser = await meRes.json();
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(verifiedUser));
            set({ currentUser: verifiedUser, token: savedToken, isLoading: false });
            return;
          } else {
            // Token is invalid or expired, purge localStorage
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.removeItem(STORAGE_KEY_USER);
          }
        } catch {
          // Network error or server unavailable during check: fallback to stored user
          try {
            const user = JSON.parse(savedUserStr);
            set({ currentUser: user, token: savedToken, isLoading: false });
            return;
          } catch {
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.removeItem(STORAGE_KEY_USER);
          }
        }
      }

      // 3. If no valid session, set logged out
      set({ currentUser: null, token: null, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  switchUser: (auth: AuthResponse) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, auth.access_token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(auth.user));
    set({ currentUser: auth.user, token: auth.access_token, error: null });
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
        const errData = await res.json().catch(() => ({ detail: 'Credenciales inválidas' }));
        throw new Error(errData.detail || 'Error al iniciar sesión');
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
        const errData = await res.json().catch(() => ({ detail: 'Error al registrar usuario' }));
        throw new Error(errData.detail || 'Error al registrar usuario');
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

  forgotPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al procesar solicitud de recuperación');
      }
      set({ isLoading: false });
      return { ok: true, message: data.message, devToken: data.dev_token };
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return { ok: false, message: err.message };
    }
  },

  resetPassword: async (token: string, newPassword: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al restablecer la contraseña');
      }
      set({ isLoading: false });
      return { ok: true, message: data.message };
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return { ok: false, message: err.message };
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    set({ currentUser: null, token: null, error: null });
  },
}));
