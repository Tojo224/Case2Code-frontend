import { describe, it, expect, beforeEach, vi } from 'vitest';
import { decideWelcome, offerTourWelcome, type WelcomeContext } from './offerWelcome';
import { useAuthStore } from '../store/useAuthStore';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { useTourStore } from '../store/useTourStore';
import { defaultPersisted } from './tourStorage';
import type { User } from '../types/collaboration';

const user = { id: 'u1', name: 'Ana', email: 'ana@example.com', avatar_color: '#3B82F6' } as User;

const ctx = (o: Partial<WelcomeContext> = {}): WelcomeContext => ({
  loggedIn: true,
  welcomed: false,
  mode: 'adaptive',
  isActive: false,
  isWelcomeOpen: false,
  isAuthModalOpen: false,
  hasLoadError: false,
  hasProjectContent: false,
  ...o,
});

describe('decideWelcome', () => {
  it('shows the card to a first-time user with an empty workspace', () => {
    expect(decideWelcome(ctx())).toBe('show');
  });

  it('never welcomes experienced users (existing classes) and remembers it', () => {
    expect(decideWelcome(ctx({ hasProjectContent: true }))).toBe('mark-welcomed');
  });

  it('waits when logged out, over the auth modal or after a load error', () => {
    expect(decideWelcome(ctx({ loggedIn: false }))).toBe('wait');
    expect(decideWelcome(ctx({ isAuthModalOpen: true }))).toBe('wait');
    expect(decideWelcome(ctx({ hasLoadError: true }))).toBe('wait');
  });

  it('does not reappear once welcomed, hidden, running or already open', () => {
    expect(decideWelcome(ctx({ welcomed: true }))).toBe('wait');
    expect(decideWelcome(ctx({ mode: 'off' }))).toBe('wait');
    expect(decideWelcome(ctx({ isActive: true }))).toBe('wait');
    expect(decideWelcome(ctx({ isWelcomeOpen: true }))).toBe('wait');
  });
});

describe('offerTourWelcome', () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    });
    useTourStore.setState({
      ...defaultPersisted(),
      isActive: false,
      activeMission: null,
      isWelcomeOpen: false,
      loadedFor: undefined,
    });
    useAuthStore.setState({ currentUser: user });
    useCollaborationStore.setState({ isAuthModalOpen: false });
    useDiagramStore.setState({ error: null, currentDocument: null, diagramsList: [] });
  });

  it('opens the welcome card for a logged-in first-time user', () => {
    expect(offerTourWelcome()).toBe(true);
    expect(useTourStore.getState().isWelcomeOpen).toBe(true);
    expect(useTourStore.getState().loadedFor).toBe('u1');
  });

  it('never opens when logged out', () => {
    useAuthStore.setState({ currentUser: null });
    expect(offerTourWelcome()).toBe(false);
    expect(useTourStore.getState().isWelcomeOpen).toBe(false);
  });

  it('skips experienced users and marks them as welcomed', () => {
    useDiagramStore.setState({ diagramsList: [{ id: 'd', classes: [{ id: 'c' }] }] as never });
    expect(offerTourWelcome()).toBe(false);
    expect(useTourStore.getState().isWelcomeOpen).toBe(false);
    expect(useTourStore.getState().welcomed).toBe(true);
  });

  it('stays silent over the auth modal or when loading projects failed', () => {
    useCollaborationStore.setState({ isAuthModalOpen: true });
    expect(offerTourWelcome()).toBe(false);
    useCollaborationStore.setState({ isAuthModalOpen: false });
    useDiagramStore.setState({ error: 'boom' });
    expect(offerTourWelcome()).toBe(false);
  });
});
