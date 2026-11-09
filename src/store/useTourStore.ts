import { create } from 'zustand';

interface TourState {
  isActive: boolean;
  isWelcomeOpen: boolean;
  completed: boolean;
  initTour: () => void;
  openWelcome: () => void;
  closeWelcome: () => void;
  start: () => void;
  finish: () => void;
  skip: () => void;
  restart: () => void;
}

export const STORAGE_KEY_TOUR = 'case2code_tour_done';

const readDone = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY_TOUR) === 'true';
  } catch {
    return false;
  }
};

const writeDone = (done: boolean) => {
  try {
    if (done) {
      localStorage.setItem(STORAGE_KEY_TOUR, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_TOUR);
    }
  } catch {
    // Storage unavailable (private mode, quota): the tour just won't persist.
  }
};

export const useTourStore = create<TourState>((set) => ({
  isActive: false,
  isWelcomeOpen: false,
  completed: false,

  initTour: () => {
    set({ completed: readDone() });
  },

  openWelcome: () => {
    set({ isWelcomeOpen: true });
  },

  closeWelcome: () => {
    set({ isWelcomeOpen: false });
  },

  start: () => {
    set({ isActive: true, isWelcomeOpen: false });
  },

  finish: () => {
    writeDone(true);
    set({ isActive: false, isWelcomeOpen: false, completed: true });
  },

  skip: () => {
    writeDone(true);
    set({ isActive: false, isWelcomeOpen: false, completed: true });
  },

  restart: () => {
    writeDone(false);
    set({ isActive: true, isWelcomeOpen: false, completed: false });
  },
}));
