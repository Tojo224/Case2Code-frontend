import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileDown, FileText, FileUp, RefreshCw, Smartphone, Sparkles } from 'lucide-react';
import { useDiagramStore } from '../../store/useDiagramStore';

interface Props {
  /** Opens the file picker of the (always mounted) hidden XMI input owned by the Navbar. */
  onImportClick: () => void;
}

const ITEM =
  'w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 ' +
  'hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer';

/**
 * Secondary "generate / export / import" actions grouped in one dropdown so the header stays
 * short. SQL, Historial, Senior AI, Clase and Compartir stay in the header because the guided
 * tour highlights them.
 */
export const GenerateMenu: React.FC<Props> = ({ onImportClick }) => {
  const {
    currentDocument,
    generateBackend,
    generateMobileApp,
    isGenerating,
    isGeneratingMobile,
    exportDocs,
    isExportingDocs,
    exportXmi,
    isExportingXmi,
    isImportingXmi,
  } = useDiagramStore();

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const hasClasses = Boolean(currentDocument && currentDocument.classes.length > 0);
  const busy = isGenerating || isGeneratingMobile || isExportingDocs || isExportingXmi || isImportingXmi;
  const run = (action: () => void | Promise<void>) => {
    setOpen(false);
    void action();
  };

  return (
    <div ref={rootRef} className="relative shrink-0" data-tour="navbar-generate">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Generar código, documentación y exportar"
        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm transition cursor-pointer whitespace-nowrap"
      >
        {busy ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          <Download className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="hidden lg:inline">{busy ? 'Generando...' : 'Generar'}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Generar y exportar"
          className="absolute right-0 top-full mt-1.5 w-72 z-40 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
        >
          <button
            role="menuitem"
            data-tour="navbar-springboot"
            disabled={isGenerating || !hasClasses}
            onClick={() => run(() => generateBackend(false))}
            title="Generar Backend Spring Boot"
            className={ITEM}
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{isGenerating ? 'Generando Spring Boot...' : 'Backend Spring Boot (.zip)'}</span>
          </button>
          <button
            role="menuitem"
            data-tour="navbar-flutter"
            disabled={isGeneratingMobile || !hasClasses}
            onClick={() => run(generateMobileApp)}
            title="Generar App Móvil Genérica (Flutter Material 3)"
            className={ITEM}
          >
            <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span>{isGeneratingMobile ? 'Generando Flutter...' : 'App móvil Flutter (.zip)'}</span>
          </button>
          <button
            role="menuitem"
            disabled={isExportingDocs || !hasClasses}
            onClick={() => run(exportDocs)}
            title="Descargar diccionario de datos y reglas de negocio (PDF)"
            className={ITEM}
          >
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{isExportingDocs ? 'Generando documento...' : 'Diccionario de datos (PDF)'}</span>
          </button>
          <button
            role="menuitem"
            disabled={isExportingDocs || !hasClasses}
            onClick={() => run(() => exportDocs(true))}
            title="Igual que el anterior, pero la IA redacta las descripciones, ejemplos y reglas (usa una consulta a la IA)"
            className={ITEM}
          >
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Diccionario con IA (PDF)</span>
          </button>

          <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" role="separator" />

          <button
            role="menuitem"
            data-tour="navbar-xmi"
            disabled={isExportingXmi || !hasClasses}
            onClick={() => run(exportXmi)}
            title="Exportar a Enterprise Architect (XMI 2.1)"
            className={ITEM}
          >
            <FileDown className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Exportar a Enterprise Architect</span>
          </button>
          <button
            role="menuitem"
            disabled={isImportingXmi || !currentDocument}
            onClick={() => run(onImportClick)}
            title="Importar modelo desde Enterprise Architect (XMI 2.1)"
            className={ITEM}
          >
            <FileUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Importar desde Enterprise Architect</span>
          </button>
        </div>
      )}
    </div>
  );
};
