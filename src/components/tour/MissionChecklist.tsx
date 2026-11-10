import React, { useEffect, useRef } from 'react';
import { Check, ChevronDown, ListChecks, X } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import { MISSIONS, missionHasTour, nextPendingMission } from '../../tour/missions';

/**
 * "Primeros pasos" checklist. A small chip that expands into the mission list. Missions are
 * ticked automatically from what the user does; "Mostrame cómo" is always optional.
 */
export const MissionChecklist: React.FC = () => {
  const collapsed = useTourStore((s) => s.collapsed);
  const completed = useTourStore((s) => s.completed);
  const setCollapsed = useTourStore((s) => s.setCollapsed);
  const hideChecklist = useTourStore((s) => s.hideChecklist);
  const start = useTourStore((s) => s.start);

  const total = MISSIONS.length;
  const doneCount = MISSIONS.filter((m) => m.id in completed).length;
  const percent = Math.round((doneCount / total) * 100);
  const next = nextPendingMission(completed);
  const nextItemRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (!collapsed && nextItemRef.current && typeof nextItemRef.current.scrollIntoView === 'function') {
      nextItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [collapsed, next?.id, doneCount]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-expanded={false}
        aria-controls="tour-checklist-panel"
        className="pointer-events-auto flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 transition-colors cursor-pointer"
      >
        <ListChecks className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <span>
          Primeros pasos {doneCount}/{total}
        </span>
        <span className="w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" aria-hidden="true">
          <span className="block h-full bg-indigo-600 dark:bg-indigo-400" style={{ width: `${percent}%` }} />
        </span>
      </button>
    );
  }

  return (
    <section
      id="tour-checklist-panel"
      aria-labelledby="tour-checklist-title"
      onWheel={(e) => e.stopPropagation()}
      className="pointer-events-auto w-[min(19rem,calc(100vw-1.5rem))] max-h-[min(60vh,24rem)] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden"
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
        <ListChecks className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
        <h2 id="tour-checklist-title" className="flex-1 text-sm font-bold text-slate-800 dark:text-slate-100">
          Primeros pasos
        </h2>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {doneCount}/{total}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Minimizar primeros pasos"
          className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 cursor-pointer"
        >
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={hideChecklist}
          aria-label="Ocultar primeros pasos (podés volver a verlos desde el botón de ayuda)"
          title="Ocultar (volvés a verlo desde el botón de ayuda)"
          className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </header>

      <div
        role="progressbar"
        aria-label="Progreso de primeros pasos"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={doneCount}
        className="mx-3 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0"
      >
        <div
          className="h-full bg-indigo-600 dark:bg-indigo-400 motion-safe:transition-all motion-safe:duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="px-3 pt-2 pb-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400 shrink-0">
        {next
          ? 'Se tildan solos a medida que avanzás. Hacelos en el orden que quieras.'
          : '¡Completaste todo! Ya dominás lo básico de Case2Code.'}
      </p>

      <ul className="c2c-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2 space-y-1">
        {MISSIONS.map((m) => {
          const done = m.id in completed;
          const isNext = next?.id === m.id;
          return (
            <li
              key={m.id}
              ref={isNext ? nextItemRef : null}
              className={`flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                isNext ? 'bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-200/70 dark:ring-indigo-800/60' : ''
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 w-4 h-4 shrink-0 rounded-full flex items-center justify-center border ${
                  done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {done && <Check className="w-3 h-3" strokeWidth={3} />}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-semibold ${
                    done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {m.title}
                  <span className="sr-only">{done ? ' (hecho)' : ' (pendiente)'}</span>
                </p>
                {!done && <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{m.why}</p>}
                {!done && missionHasTour(m.id) && (
                  <button
                    type="button"
                    onClick={() => start(m.id)}
                    className="mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 rounded cursor-pointer"
                  >
                    Mostrame cómo
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
