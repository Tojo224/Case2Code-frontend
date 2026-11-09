import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Database,
  Download,
  Copy,
  Check,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { SqlDialect } from '../../types/uml';
import { api } from '../../services/api';

interface DialectOption {
  id: SqlDialect;
  label: string;
  badge: string;
}

const DIALECT_OPTIONS: DialectOption[] = [
  { id: 'postgresql', label: 'PostgreSQL', badge: 'PG 14+' },
  { id: 'mysql', label: 'MySQL', badge: 'InnoDB 8.0+' },
  { id: 'sqlite', label: 'SQLite', badge: 'SQLite 3' },
  { id: 'sqlserver', label: 'SQL Server', badge: 'T-SQL' },
];

export const SqlPreviewModal: React.FC = () => {
  const { isSqlModalOpen, closeSqlModal, currentDocument } = useDiagramStore();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [activeDialect, setActiveDialect] = useState<SqlDialect>('postgresql');
  const [sqlCode, setSqlCode] = useState<string>('');
  const [filename, setFilename] = useState<string>('schema_postgresql.sql');
  const [isLoadingSql, setIsLoadingSql] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync native <dialog> modal state with Zustand store
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isSqlModalOpen) {
      if (!dialog.open && typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
    } else if (dialog.open && typeof dialog.close === 'function') {
      dialog.close();
    }
  }, [isSqlModalOpen]);

  // Native close event listener & light-dismiss fallback for browsers without HTMLDialogElement.prototype.closedBy
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      closeSqlModal();
    };

    dialog.addEventListener('close', handleClose);

    let cleanupFallback: (() => void) | undefined;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent, el: HTMLDialogElement) => {
        const r = el.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e, dialog);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e, dialog)) {
          dialog.close();
        }
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupFallback = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (cleanupFallback) cleanupFallback();
    };
  }, [closeSqlModal]);

  // Fetch SQL preview whenever modal opens, dialect changes, or diagram version updates
  useEffect(() => {
    if (!isSqlModalOpen || !currentDocument) return;

    let cancelled = false;
    const loadSql = async () => {
      setIsLoadingSql(true);
      setErrorMsg(null);
      try {
        const res = await api.getSqlPreview(currentDocument.id, activeDialect);
        if (!cancelled) {
          setSqlCode(res.sql);
          setFilename(res.filename);
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message || 'Error al generar el código SQL.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSql(false);
        }
      }
    };

    loadSql();
    return () => {
      cancelled = true;
    };
  }, [isSqlModalOpen, currentDocument?.id, currentDocument?.version, activeDialect]);

  const handleCopy = async () => {
    if (!sqlCode) return;
    try {
      await navigator.clipboard.writeText(sqlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMsg('No se pudo copiar al portapapeles.');
    }
  };

  const handleExport = async () => {
    if (!currentDocument) return;
    setIsExporting(true);
    setErrorMsg(null);
    try {
      await api.exportSql(currentDocument.id, activeDialect, currentDocument.name);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al exportar el archivo SQL.');
    } finally {
      setIsExporting(false);
    }
  };

  const lines = sqlCode ? sqlCode.replace(/\n$/, '').split('\n') : [];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as any)}
      className="m-auto w-full max-w-4xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl p-0 open:flex open:flex-col max-h-[88vh] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 id={titleId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Generador y Exportador SQL DDL
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {currentDocument
                ? `${currentDocument.name} (${currentDocument.classes.length} clases, ${currentDocument.relationships.length} relaciones)`
                : 'Selecciona un motor de base de datos para generar el script'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={closeSqlModal}
          aria-label="Cerrar generador SQL"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dialect Selector & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {DIALECT_OPTIONS.map((opt) => {
            const isActive = activeDialect === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`sql-dialect-${opt.id}`}
                onClick={() => setActiveDialect(opt.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive
                      ? 'bg-amber-700/80 text-amber-100'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {opt.badge}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden md:inline">
            {filename}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={isLoadingSql || !sqlCode}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar SQL</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isLoadingSql || !currentDocument || currentDocument.classes.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 shadow-xs transition cursor-pointer"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Exportar .sql</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="px-5 py-2 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-900 flex items-center space-x-2 text-xs text-red-700 dark:text-red-300 shrink-0">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Code Viewer Body */}
      <div className="flex-1 overflow-auto bg-slate-950 text-slate-100 font-mono text-xs select-text">
        {isLoadingSql ? (
          <div className="flex items-center justify-center py-20 text-slate-400 space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>Generando script SQL ({activeDialect})...</span>
          </div>
        ) : (
          <div className="p-4 min-w-max">
            {lines.map((line, idx) => (
              <div key={idx} className="flex leading-relaxed hover:bg-slate-900/80 px-1 rounded-xs">
                <span className="w-10 shrink-0 text-right pr-4 text-slate-600 select-none">
                  {idx + 1}
                </span>
                <pre className="m-0 whitespace-pre text-slate-200">{line || ' '}</pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
        <span>
          Incluye claves primarias, foráneas, tablas intermedias N:M, herencia JOINED e índices de optimización.
        </span>
        <button
          type="button"
          onClick={closeSqlModal}
          className="px-3 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </dialog>
  );
};
