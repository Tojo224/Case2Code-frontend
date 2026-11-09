import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';

export const TourWelcome: React.FC = () => {
  const start = useTourStore((s) => s.start);
  const skip = useTourStore((s) => s.skip);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-welcome-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') skip();
      }}
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 id="tour-welcome-title" className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          ¡Bienvenido a Case2Code!
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          ¿Querés un recorrido guiado de un par de minutos? Vas a crear tu primera clase, relacionarla con otra y
          ver cómo generar el backend. Podés volver a verlo cuando quieras desde el botón de ayuda.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={skip}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Ahora no
          </button>
          <button
            type="button"
            autoFocus
            onClick={start}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            Empezar tutorial
          </button>
        </div>
      </div>
    </div>
  );
};
