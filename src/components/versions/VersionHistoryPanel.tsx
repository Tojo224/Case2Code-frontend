import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, History, RefreshCw, Save, X } from 'lucide-react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { useVersionStore } from '../../store/useVersionStore';
import { VersionDetail } from './VersionDetail';
import { VersionListItem } from './VersionListItem';

export const VersionHistoryPanel: React.FC = () => {
  const titleId = useId();
  const diagramId = useDiagramStore((s) => s.currentDocument?.id);

  const versions = useVersionStore((s) => s.versions);
  const isPanelOpen = useVersionStore((s) => s.isPanelOpen);
  const isLoading = useVersionStore((s) => s.isLoading);
  const isWorking = useVersionStore((s) => s.isWorking);
  const error = useVersionStore((s) => s.error);
  const selectedNumber = useVersionStore((s) => s.selectedNumber);
  const diff = useVersionStore((s) => s.diff);
  const closePanel = useVersionStore((s) => s.closePanel);
  const loadVersions = useVersionStore((s) => s.loadVersions);
  const createCheckpoint = useVersionStore((s) => s.createCheckpoint);
  const selectVersion = useVersionStore((s) => s.selectVersion);
  const restore = useVersionStore((s) => s.restore);
  const reset = useVersionStore((s) => s.reset);

  const [label, setLabel] = useState('');
  const previousDiagramId = useRef<string | undefined>(undefined);

  // History belongs to one diagram: drop it when the active diagram changes.
  useEffect(() => {
    if (previousDiagramId.current && previousDiagramId.current !== diagramId) {
      reset();
      setLabel('');
    }
    previousDiagramId.current = diagramId;
  }, [diagramId, reset]);

  useEffect(() => {
    if (isPanelOpen && diagramId) {
      void loadVersions(diagramId);
    }
  }, [isPanelOpen, diagramId, loadVersions]);

  useEffect(() => {
    if (!isPanelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isPanelOpen, closePanel]);

  if (!isPanelOpen) return null;

  const selected = versions.find((v) => v.number === selectedNumber) ?? null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagramId || isWorking) return;
    const trimmed = label.trim();
    const created = await createCheckpoint(diagramId, trimmed || undefined);
    if (created) setLabel('');
  };

  const handleSelect = (number: number) => {
    if (!diagramId) return;
    void selectVersion(diagramId, number === selectedNumber ? null : number);
  };

  const handleRestore = async (number: number) => {
    if (!diagramId) return;
    await restore(diagramId, number);
  };

  return (
    <>
      <div
        aria-hidden="true"
        onClick={closePanel}
        className="fixed inset-0 z-40 bg-slate-900/30 sm:hidden"
      />
      <aside
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        data-testid="version-history-panel"
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <History className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="text-sm font-bold">
                Historial de versiones
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Guardá hitos y volvé atrás cuando quieras
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Cerrar historial de versiones"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <form
          onSubmit={handleCreate}
          className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0"
        >
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={255}
            placeholder="Nombre de la versión (opcional)"
            aria-label="Nombre de la versión"
            disabled={isWorking || !diagramId}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isWorking || !diagramId}
            data-testid="version-create"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition cursor-pointer shrink-0"
          >
            {isWorking ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>Guardar versión</span>
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="px-4 py-2 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-900 flex items-start gap-2 text-xs text-red-700 dark:text-red-300 shrink-0"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {!diagramId ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Abrí un proyecto para ver su historial.
            </p>
          ) : isLoading && versions.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-500" aria-hidden="true" />
              <span>Cargando historial...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400" data-testid="version-empty">
              <p className="font-semibold text-slate-700 dark:text-slate-200">Todavía no hay versiones</p>
              <p className="mt-1">Guardá la primera para poder volver a este punto más adelante.</p>
            </div>
          ) : (
            <>
              <ul className="space-y-2" aria-label="Versiones guardadas">
                {versions.map((v) => (
                  <VersionListItem
                    key={v.id}
                    version={v}
                    selected={v.number === selectedNumber}
                    onSelect={handleSelect}
                  />
                ))}
              </ul>
              {selected && (
                <VersionDetail
                  version={selected}
                  diff={diff}
                  isWorking={isWorking}
                  diffUnavailable={Boolean(error)}
                  onRestore={handleRestore}
                />
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
};
