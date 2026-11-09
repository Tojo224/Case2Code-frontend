import { describe, it, expect, beforeEach } from 'vitest';
import { offerTourWelcome } from './offerWelcome';
import { useAuthStore } from '../store/useAuthStore';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { useTourStore } from '../store/useTourStore';
import type { User } from '../types/collaboration';

const user = { id: 'u1', name: 'Ana', email: 'ana@example.com', avatar_color: '#3B82F6' } as User;

describe('offerTourWelcome', () => {
  beforeEach(() => {
    useTourStore.setState({ isActive: false, isWelcomeOpen: false, completed: false });
    useAuthStore.setState({ currentUser: user });
    useCollaborationStore.setState({ isAuthModalOpen: false });
    useDiagramStore.setState({ error: null });
  });

  it('opens the welcome prompt for a logged-in first-time user', () => {
    expect(offerTourWelcome()).toBe(true);
    expect(useTourStore.getState().isWelcomeOpen).toBe(true);
  });

  it('never opens when logged out', () => {
    useAuthStore.setState({ currentUser: null });
    expect(offerTourWelcome()).toBe(false);
    expect(useTourStore.getState().isWelcomeOpen).toBe(false);
  });

  it('does not open over the auth modal', () => {
    useCollaborationStore.setState({ isAuthModalOpen: true });
    expect(offerTourWelcome()).toBe(false);
  });

  it('does not reappear once completed or skipped', () => {
    useTourStore.setState({ completed: true });
    expect(offerTourWelcome()).toBe(false);
  });

  it('does not open while the tour is already running', () => {
    useTourStore.setState({ isActive: true });
    expect(offerTourWelcome()).toBe(false);
  });

  it('stays silent when loading projects failed', () => {
    useDiagramStore.setState({ error: 'boom' });
    expect(offerTourWelcome()).toBe(false);
  });
});
