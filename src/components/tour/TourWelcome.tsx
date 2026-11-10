import React from 'react';
import { Compass, Sparkles } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';

/**
 * Friendly two-choice card for first-time users. Non-modal: it never blocks the canvas and
 * does not trap focus.
 */
export const TourWelcome: React.FC = () => {
  const start = useTourStore((s) => s.start);
  const explore = useTourStore((s) => s.explore);

  return (
    <div
      role="dialog"
      aria-labelledby="tour-welcome-title"
      aria-describedby="tour-welcome-text"
      onKeyDown={(e) => {
        if (e.key === 'Escape') explore();
      }}
      className="pointer-events-auto w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-4 h-4" aria-hidden="true" />
        </span>
        <h2 id="tour-welcome-title" className="text-sm font-bold text-slate-800 dark:text-slate-100">
          ¡Hola! Bienvenido a Case2Code
        </h2>
      </div>
      <p id="tour-welcome-text" className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
        Armá tu primer diagrama a tu ritmo. ¿Cómo preferís empezar?
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          autoFocus
          onClick={() => start()}
          className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          <Compass className="w-3.5 h-3.5" aria-hidden="true" />
          Guiarme paso a paso
        </button>
        <button
          type="button"
          onClick={explore}
          className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Explorar por mi cuenta
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        Vas a ver una lista de primeros pasos que se tilda sola.
      </p>
    </div>
  );
};
