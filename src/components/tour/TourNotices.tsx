import React, { useEffect } from 'react';
import { CheckCircle2, Lightbulb, X } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import { getHint } from '../../tour/hints';
import { getMission } from '../../tour/missions';

const NOTICE_MS = 8_000;

/** Mission-completed toast: short, non-blocking, with a gentle pointer to the next mission. */
export const MissionToast: React.FC = () => {
  const notice = useTourStore((s) => s.notice);
  const clearNotice = useTourStore((s) => s.clearNotice);
  const start = useTourStore((s) => s.start);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(clearNotice, NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice, clearNotice]);

  if (!notice) return null;
  const next = notice.nextMissionId ? getMission(notice.nextMissionId) : undefined;

  return (
    <div
      key={notice.key}
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-[min(19rem,calc(100vw-1.5rem))] flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/95 border border-emerald-300 dark:border-emerald-700 shadow-xl p-3 animate-in fade-in duration-150"
    >
      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">{notice.message}</p>
        {next && (
          <p className="mt-0.5 text-[11px] text-emerald-800/80 dark:text-emerald-200/80">
            Siguiente: {next.title}.{' '}
            <button
              type="button"
              onClick={() => start(next.id)}
              className="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 rounded cursor-pointer"
            >
              Mostrame cómo
            </button>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={clearNotice}
        aria-label="Cerrar aviso"
        className="p-0.5 rounded text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};

/** Contextual hint: one small card at a time, always dismissible, never modal. */
export const HintCard: React.FC = () => {
  const activeHintId = useTourStore((s) => s.activeHintId);
  const clearHint = useTourStore((s) => s.clearHint);
  const disableHints = useTourStore((s) => s.disableHints);
  const start = useTourStore((s) => s.start);

  const hint = activeHintId ? getHint(activeHintId) : undefined;
  if (!hint) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-[min(19rem,calc(100vw-1.5rem))] rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-lg p-3"
    >
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{hint.title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-300">{hint.text}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {hint.mission && (
          <button
            type="button"
            onClick={() => start(hint.mission)}
            className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 cursor-pointer"
          >
            Mostrame
          </button>
        )}
        <button
          type="button"
          onClick={clearHint}
          className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 cursor-pointer"
        >
          Ahora no
        </button>
        <button
          type="button"
          onClick={disableHints}
          className="ml-auto text-[11px] text-slate-500 dark:text-slate-400 underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 rounded cursor-pointer"
        >
          No mostrar más consejos
        </button>
      </div>
    </div>
  );
};
