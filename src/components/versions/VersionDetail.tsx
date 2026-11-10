import React, { useEffect, useState } from 'react';
import { Minus, Pencil, Plus, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import type { DiagramChange, DiagramVersion, VersionDiff } from '../../types/versions';
import { changeTone, kindLabel, type ChangeTone } from './versionHelpers';

interface Props {
  version: DiagramVersion;
  diff: VersionDiff | null;
  isWorking: boolean;
  diffUnavailable?: boolean;
  onRestore: (number: number) => void;
}

const TONE_STYLES: Record<ChangeTone, { icon: React.ReactNode; className: string }> = {
  added: {
    icon: <Plus className="w-3 h-3" aria-hidden="true" />,
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  removed: {
    icon: <Minus className="w-3 h-3" aria-hidden="true" />,
    className: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  },
  changed: {
    icon: <Pencil className="w-3 h-3" aria-hidden="true" />,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
};

const ChangeRow: React.FC<{ change: DiagramChange }> = ({ change }) => {
  const tone = TONE_STYLES[changeTone(change.kind)];
  return (
    <li className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200">
      <span className={`mt-0.5 p-0.5 rounded shrink-0 ${tone.className}`}>{tone.icon}</span>
      <span>{change.description}</span>
    </li>
  );
};

export const VersionDetail: React.FC<Props> = ({ version, diff, isWorking, diffUnavailable = false, onRestore }) => {
  const [confirming, setConfirming] = useState(false);

  // A pending confirmation never survives a change of the selected version.
  useEffect(() => {
    setConfirming(false);
  }, [version.number]);

  return (
    <section
      aria-label={`Detalle de la versión ${version.number}`}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-3"
    >
      <div>
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
          Cambios de v{version.number} ({kindLabel(version.kind)}) al estado actual
        </h3>
        {diff ? (
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400" data-testid="version-diff-summary">
            {diff.summary}
          </p>
        ) : null}
      </div>

      {!diff && diffUnavailable ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No se pudieron calcular las diferencias.
        </p>
      ) : !diff ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" aria-hidden="true" />
          <span>Calculando diferencias...</span>
        </div>
      ) : diff.changes.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Esta versión es igual al estado actual del diagrama.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1" data-testid="version-diff-list">
          {diff.changes.map((change, idx) => (
            <ChangeRow key={`${change.kind}-${change.target_id}-${idx}`} change={change} />
          ))}
        </ul>
      )}

      {confirming ? (
        <div
          role="alertdialog"
          aria-label="Confirmar restauración"
          className="rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3 space-y-2"
        >
          <p className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
            <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>
              Vas a volver el diagrama a la versión {version.number}. Antes se guarda una versión de
              seguridad del estado actual, así que podés deshacer la restauración cuando quieras. Los
              colaboradores conectados van a ver el cambio al instante.
            </span>
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isWorking}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onRestore(version.number)}
              disabled={isWorking}
              data-testid="version-restore-confirm"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition cursor-pointer"
            >
              {isWorking ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{isWorking ? 'Restaurando...' : 'Sí, restaurar'}</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={isWorking}
          data-testid="version-restore"
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-500/10 disabled:opacity-50 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Restaurar esta versión</span>
        </button>
      )}
    </section>
  );
};
