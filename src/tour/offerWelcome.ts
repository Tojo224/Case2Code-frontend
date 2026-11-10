import { useAuthStore } from '../store/useAuthStore';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { useTourStore } from '../store/useTourStore';
import { takeSnapshot } from './tourSteps';

export interface WelcomeContext {
  loggedIn: boolean;
  welcomed: boolean;
  mode: 'adaptive' | 'off';
  isActive: boolean;
  isWelcomeOpen: boolean;
  isAuthModalOpen: boolean;
  hasLoadError: boolean;
  /** Any of the user's projects already has classes. */
  hasProjectContent: boolean;
}

/**
 * - `show`: first-time user with an empty workspace.
 * - `mark-welcomed`: experienced user (existing classes): never welcome them, remember it.
 * - `wait`: not the right moment (logged out, auth modal, load error...) or nothing to do.
 */
export type WelcomeDecision = 'show' | 'mark-welcomed' | 'wait';

export const decideWelcome = (ctx: WelcomeContext): WelcomeDecision => {
  if (!ctx.loggedIn || ctx.hasLoadError || ctx.isAuthModalOpen) return 'wait';
  if (ctx.welcomed || ctx.mode === 'off' || ctx.isActive || ctx.isWelcomeOpen) return 'wait';
  return ctx.hasProjectContent ? 'mark-welcomed' : 'show';
};

/**
 * Offers the friendly welcome card to first-time users. Call it once the session and the
 * project list are loaded. Returns true when the card was opened.
 */
export const offerTourWelcome = (): boolean => {
  const user = useAuthStore.getState().currentUser;
  if (!user) return false;

  // Make sure the progress loaded belongs to this user (the session may have just resolved).
  if (useTourStore.getState().loadedFor !== user.id) useTourStore.getState().initTour();
  const tour = useTourStore.getState();

  const decision = decideWelcome({
    loggedIn: true,
    welcomed: tour.welcomed,
    mode: tour.mode,
    isActive: tour.isActive,
    isWelcomeOpen: tour.isWelcomeOpen,
    isAuthModalOpen: useCollaborationStore.getState().isAuthModalOpen,
    hasLoadError: !!useDiagramStore.getState().error,
    hasProjectContent: takeSnapshot().hasProjectContent,
  });

  if (decision === 'mark-welcomed') tour.markWelcomed();
  if (decision !== 'show') return false;
  tour.openWelcome();
  return true;
};
