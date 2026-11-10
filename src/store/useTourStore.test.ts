import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTourStore } from './useTourStore';
import { useAuthStore } from './useAuthStore';
import {
  LEGACY_STORAGE_KEY_TOUR,
  STORAGE_KEY_TOUR,
  defaultPersisted,
  parsePersisted,
  storageKeyFor,
} from '../tour/tourStorage';
import type { User } from '../types/collaboration';

const createMemoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
};

const user = (id: string) => ({ id, name: id, email: `${id}@example.com`, avatar_color: '#3B82F6' }) as User;

const read = (storage: ReturnType<typeof createMemoryStorage>, userId?: string) =>
  JSON.parse(storage.getItem(storageKeyFor(userId))!);

describe('useTourStore', () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
    useAuthStore.setState({ currentUser: null });
    useTourStore.setState({
      ...defaultPersisted(),
      isActive: false,
      activeMission: null,
      isWelcomeOpen: false,
      notice: null,
      activeHintId: null,
      loadedFor: undefined,
    });
  });

  it('initTour starts from defaults when nothing is stored', () => {
    useTourStore.getState().initTour();
    const s = useTourStore.getState();
    expect(s.welcomed).toBe(false);
    expect(s.mode).toBe('adaptive');
    expect(s.completed).toEqual({});
  });

  it('migrates the legacy case2code_tour_done flag to welcomed', () => {
    storage.setItem(LEGACY_STORAGE_KEY_TOUR, 'true');
    useTourStore.getState().initTour();
    expect(useTourStore.getState().welcomed).toBe(true);
    expect(useTourStore.getState().completed).toEqual({});
  });

  it('prefers the v2 data over the legacy flag', () => {
    storage.setItem(LEGACY_STORAGE_KEY_TOUR, 'true');
    storage.setItem(storageKeyFor(null), JSON.stringify({ ...defaultPersisted(), welcomed: false, collapsed: true }));
    useTourStore.getState().initTour();
    expect(useTourStore.getState().welcomed).toBe(false);
    expect(useTourStore.getState().collapsed).toBe(true);
  });

  it('keeps progress per user and falls back to an anonymous namespace', () => {
    useTourStore.getState().initTour();
    useTourStore.getState().completeMissions(['create-project'], 111);
    expect(read(storage).completed).toEqual({ 'create-project': 111 });

    useAuthStore.setState({ currentUser: user('u1') });
    useTourStore.getState().initTour();
    expect(useTourStore.getState().completed).toEqual({});
    useTourStore.getState().completeMissions(['first-class'], 222);
    expect(read(storage, 'u1').completed).toEqual({ 'first-class': 222 });
    expect(read(storage).completed).toEqual({ 'create-project': 111 });

    useAuthStore.setState({ currentUser: user('u2') });
    useTourStore.getState().initTour();
    expect(useTourStore.getState().completed).toEqual({});
  });

  it('persists the documented shape under the versioned key', () => {
    useAuthStore.setState({ currentUser: user('u1') });
    useTourStore.getState().initTour();
    useTourStore.getState().completeMissions(['create-project'], 5);
    useTourStore.getState().showHint('relationships');
    useTourStore.getState().disableHints();
    useTourStore.getState().setCollapsed(true);
    expect(storageKeyFor('u1').startsWith(STORAGE_KEY_TOUR)).toBe(true);
    expect(read(storage, 'u1')).toEqual({
      version: 2,
      welcomed: false,
      mode: 'adaptive',
      collapsed: true,
      completed: { 'create-project': 5 },
      dismissedHints: ['relationships'],
      hintsDisabled: true,
    });
  });

  it('completeMissions never overwrites an earlier timestamp', () => {
    useTourStore.getState().initTour();
    useTourStore.getState().completeMissions(['first-class'], 1);
    useTourStore.getState().completeMissions(['first-class', 'second-class'], 2);
    expect(useTourStore.getState().completed).toEqual({ 'first-class': 1, 'second-class': 2 });
  });

  it('tolerates unavailable storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => useTourStore.getState().initTour()).not.toThrow();
    expect(() => useTourStore.getState().completeMissions(['create-project'])).not.toThrow();
    expect(useTourStore.getState().completed).toHaveProperty('create-project');
  });

  it('ignores corrupt or foreign storage content', () => {
    expect(parsePersisted('{not json')).toBeNull();
    expect(parsePersisted(JSON.stringify({ version: 1 }))).toBeNull();
    const cleaned = parsePersisted(
      JSON.stringify({ version: 2, completed: { a: 1, b: 'x' }, dismissedHints: ['h', 3], mode: 'weird' }),
    )!;
    expect(cleaned.completed).toEqual({ a: 1 });
    expect(cleaned.dismissedHints).toEqual(['h']);
    expect(cleaned.mode).toBe('adaptive');
  });

  it('start launches the next pending mission tour and marks the user as welcomed', () => {
    useTourStore.getState().initTour();
    useTourStore.getState().openWelcome();
    useTourStore.getState().completeMissions(['create-project']);
    useTourStore.getState().start();
    const s = useTourStore.getState();
    expect(s.isActive).toBe(true);
    expect(s.activeMission).toBe('first-class');
    expect(s.isWelcomeOpen).toBe(false);
    expect(s.welcomed).toBe(true);
  });

  it('start can target a specific mission and ignores unknown ones', () => {
    useTourStore.getState().initTour();
    useTourStore.getState().start('ask-ai');
    expect(useTourStore.getState().activeMission).toBe('ask-ai');
    useTourStore.getState().finish();
    useTourStore.getState().start('does-not-exist');
    expect(useTourStore.getState().isActive).toBe(false);
  });

  it('finish and skip end the micro-tour; skip also closes the welcome card', () => {
    useTourStore.getState().initTour();
    useTourStore.getState().start('first-class');
    useTourStore.getState().finish();
    expect(useTourStore.getState().isActive).toBe(false);
    expect(useTourStore.getState().activeMission).toBeNull();

    useTourStore.getState().openWelcome();
    useTourStore.getState().skip();
    expect(useTourStore.getState().isWelcomeOpen).toBe(false);
    expect(useTourStore.getState().welcomed).toBe(true);
  });

  it('explore closes the welcome keeping checklist and hints on', () => {
    useTourStore.getState().initTour();
    useTourStore.getState().openWelcome();
    useTourStore.getState().explore();
    const s = useTourStore.getState();
    expect(s.isWelcomeOpen).toBe(false);
    expect(s.welcomed).toBe(true);
    expect(s.mode).toBe('adaptive');
    expect(s.hintsDisabled).toBe(false);
  });

  it('restart re-opens the checklist expanded and offers hints and tours again', () => {
    useTourStore.getState().initTour();
    useTourStore.getState().completeMissions(['create-project'], 1);
    useTourStore.getState().showHint('attributes');
    useTourStore.getState().disableHints();
    useTourStore.getState().setCollapsed(true);
    useTourStore.getState().hideChecklist();

    useTourStore.getState().restart();
    const s = useTourStore.getState();
    expect(s.mode).toBe('adaptive');
    expect(s.collapsed).toBe(false);
    expect(s.hintsDisabled).toBe(false);
    expect(s.dismissedHints).toEqual([]);
    expect(s.isActive).toBe(false);
    expect(s.completed).toEqual({ 'create-project': 1 });
    expect(read(storage).mode).toBe('adaptive');
  });

  it('showHint records the hint as seen and clearHint hides it', () => {
    useTourStore.getState().initTour();
    useTourStore.getState().showHint('generate');
    expect(useTourStore.getState().activeHintId).toBe('generate');
    expect(useTourStore.getState().dismissedHints).toEqual(['generate']);
    useTourStore.getState().clearHint();
    expect(useTourStore.getState().activeHintId).toBeNull();
    expect(useTourStore.getState().dismissedHints).toEqual(['generate']);
  });
});
