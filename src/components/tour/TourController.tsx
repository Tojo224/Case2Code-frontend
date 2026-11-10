import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useTourStore } from '../../store/useTourStore';
import { runMicroTour } from '../../tour/tourRunner';
import { useAdaptiveTour } from '../../tour/useAdaptiveTour';
import { MissionChecklist } from './MissionChecklist';
import { HintCard, MissionToast } from './TourNotices';
import { TourWelcome } from './TourWelcome';

/**
 * Mount once. Detects missions, schedules hints, runs the micro-tour while `isActive` and
 * renders the floating checklist stack (bottom-left, click-through except for its own cards).
 */
export const TourController: React.FC = () => {
  useAdaptiveTour();

  const loggedIn = useAuthStore((s) => !!s.currentUser);
  const isActive = useTourStore((s) => s.isActive);
  const activeMission = useTourStore((s) => s.activeMission);
  const isWelcomeOpen = useTourStore((s) => s.isWelcomeOpen);
  const mode = useTourStore((s) => s.mode);

  useEffect(() => {
    if (!isActive || !activeMission) return;
    return runMicroTour(activeMission);
  }, [isActive, activeMission]);

  // The micro-tour owns the screen while it runs; stay out of its way.
  if (!loggedIn || isActive) return null;

  return (
    <div className="pointer-events-none fixed left-3 bottom-3 z-40 flex flex-col items-start gap-2">
      <MissionToast />
      <HintCard />
      {isWelcomeOpen && <TourWelcome />}
      {!isWelcomeOpen && mode === 'adaptive' && <MissionChecklist />}
    </div>
  );
};
