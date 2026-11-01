import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTourStore, STORAGE_KEY_TOUR } from './useTourStore';

const createMemoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
};

describe('useTourStore', () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
    useTourStore.setState({ isActive: false, isWelcomeOpen: false, completed: false });
  });

  it('initTour reads the persisted flag', () => {
    useTourStore.getState().initTour();
    expect(useTourStore.getState().completed).toBe(false);

    storage.setItem(STORAGE_KEY_TOUR, 'true');
    useTourStore.getState().initTour();
    expect(useTourStore.getState().completed).toBe(true);
  });

  it('initTour tolerates unavailable storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    useTourStore.getState().initTour();
    expect(useTourStore.getState().completed).toBe(false);
  });

  it('openWelcome shows the dialog and start activates the tour', () => {
    useTourStore.getState().openWelcome();
    expect(useTourStore.getState().isWelcomeOpen).toBe(true);

    useTourStore.getState().start();
    const s = useTourStore.getState();
    expect(s.isActive).toBe(true);
    expect(s.isWelcomeOpen).toBe(false);
    expect(storage.getItem(STORAGE_KEY_TOUR)).toBeNull();
  });

  it('skip marks completed and persists', () => {
    useTourStore.getState().start();
    useTourStore.getState().skip();
    const s = useTourStore.getState();
    expect(s.isActive).toBe(false);
    expect(s.completed).toBe(true);
    expect(storage.getItem(STORAGE_KEY_TOUR)).toBe('true');
  });

  it('finish marks completed and persists', () => {
    useTourStore.getState().start();
    useTourStore.getState().finish();
    const s = useTourStore.getState();
    expect(s.isActive).toBe(false);
    expect(s.completed).toBe(true);
    expect(storage.getItem(STORAGE_KEY_TOUR)).toBe('true');
  });

  it('restart clears the flag and starts the tour', () => {
    storage.setItem(STORAGE_KEY_TOUR, 'true');
    useTourStore.getState().initTour();
    useTourStore.getState().restart();
    const s = useTourStore.getState();
    expect(s.isActive).toBe(true);
    expect(s.completed).toBe(false);
    expect(storage.getItem(STORAGE_KEY_TOUR)).toBeNull();
  });
});
