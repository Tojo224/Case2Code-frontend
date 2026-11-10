import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDiagramStore } from '../../store/useDiagramStore';
import { useTourStore } from '../../store/useTourStore';
import { runMicroTour } from '../../tour/tourRunner';
import { useAdaptiveTour } from '../../tour/useAdaptiveTour';
import { MissionChecklist } from './MissionChecklist';
import { HintCard, MissionToast } from './TourNotices';
import { TourWelcome } from './TourWelcome';

/**
 * Mount once. Detects missions, schedules hints, runs the micro-tour while `isActive` and
 * renders the floating checklist stack (offset to the right of the sidebar + React Flow controls).
 */
export const TourController: React.FC = () => {
  useAdaptiveTour();

  const loggedIn = useAuthStore((s) => !!s.currentUser);
  const isActive = useTourStore((s) => s.isActive);
  const activeMission = useTourStore((s) => s.activeMission);
  const isWelcomeOpen = useTourStore((s) => s.isWelcomeOpen);
  const mode = useTourStore((s) => s.mode);
  const isSidebarCollapsed = useDiagramStore((s) => s.isSidebarCollapsed);

  useEffect(() => {
    if (!isActive || !activeMission) return;
    return runMicroTour(activeMission);
  }, [isActive, activeMission]);

  if (!loggedIn) return null;

  // Offset right of the RelationshipSidebar (48px collapsed / 224px expanded) AND React Flow's
  // bottom-left <Controls /> (+ / - / fitView) so the pill and checklist never cover them.
  const leftOffsetClass = isSidebarCollapsed ? 'left-28' : 'left-28 md:left-72';

  return (
    <div
      className={`pointer-events-none fixed ${leftOffsetClass} bottom-3 ${
        isActive ? 'z-[10002]' : 'z-40'
      } flex flex-col items-start gap-2 transition-[left] duration-300`}
    >
      <MissionToast />
      {!isActive && (
        <>
          <HintCard />
          {isWelcomeOpen && <TourWelcome />}
          {!isWelcomeOpen && mode === 'adaptive' && <MissionChecklist />}
        </>
      )}
    </div>
  );
};
