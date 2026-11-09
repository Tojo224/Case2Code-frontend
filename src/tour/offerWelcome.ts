import { useAuthStore } from '../store/useAuthStore';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { useTourStore } from '../store/useTourStore';

/**
 * Offers the welcome prompt to first-time users. Call it once the session and the
 * project list are loaded. It stays silent when logged out, while the auth modal is
 * open, if loading failed, or if the tour was already completed or skipped.
 */
export const offerTourWelcome = (): boolean => {
  const tour = useTourStore.getState();
  if (tour.completed || tour.isActive || tour.isWelcomeOpen) return false;
  if (!useAuthStore.getState().currentUser) return false;
  if (useCollaborationStore.getState().isAuthModalOpen) return false;
  if (useDiagramStore.getState().error) return false;

  tour.openWelcome();
  return true;
};
