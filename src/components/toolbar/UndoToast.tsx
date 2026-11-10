import React, { useEffect } from 'react';
import { useUndoStore } from '../../store/useUndoStore';

const TOAST_MS = 6000;

export const UndoToast: React.FC = () => {
  const lastToast = useUndoStore((s) => s.lastToast);
  const notice = useUndoStore((s) => s.notice);
  const undo = useUndoStore((s) => s.undo);

  useEffect(() => {
    if (!lastToast) return;
    const t = setTimeout(() => useUndoStore.getState().dismissToast(), TOAST_MS);
    return () => clearTimeout(t);
  }, [lastToast]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => useUndoStore.getState().clearNotice(), TOAST_MS);
    return () => clearTimeout(t);
  }, [notice]);

  const text = notice ?? (lastToast ? `${lastToast.label} · ` : null);
  if (!text) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs px-3 py-2 shadow-lg"
    >
      <span>{text}</span>
      {!notice && (
        <button
          onClick={() => void undo()}
          className="font-semibold text-sky-300 hover:text-sky-200 underline cursor-pointer"
        >
          Deshacer
        </button>
      )}
    </div>
  );
};
