import React, { useEffect } from 'react';
import { useTourStore } from '../../store/useTourStore';
import { runTour } from '../../tour/tourRunner';
import { TourWelcome } from './TourWelcome';

/** Mount once. Runs the guided tour while `isActive` and renders the welcome prompt. */
export const TourController: React.FC = () => {
  const isActive = useTourStore((s) => s.isActive);
  const isWelcomeOpen = useTourStore((s) => s.isWelcomeOpen);

  useEffect(() => {
    if (!isActive) return;
    return runTour();
  }, [isActive]);

  return isWelcomeOpen ? <TourWelcome /> : null;
};
