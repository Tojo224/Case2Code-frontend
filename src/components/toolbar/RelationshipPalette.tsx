import React, { useEffect } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { RelationshipType } from '../../types/uml';
import { MousePointer2, X } from 'lucide-react';

interface PaletteTool {
  type: RelationshipType;
  label: string;
  symbol: string;
  tooltip: string;
}

const TOOLS: PaletteTool[] = [
  {
    type: 'ONE_TO_MANY',
    label: '1 : N',
    symbol: '1 ──► *',
    tooltip: 'Uno a Muchos (1:N) - Padre a colección de hijos',
  },
  {
    type: 'MANY_TO_ONE',
    label: 'N : 1',
    symbol: '* ──► 1',
    tooltip: 'Muchos a Uno (N:1) - Referencia a clave foránea',
  },
  {
    type: 'ONE_TO_ONE',
    label: '1 : 1',
    symbol: '1 ──► 1',
    tooltip: 'Uno a Uno (1:1) - Relación única directa',
  },
  {
    type: 'MANY_TO_MANY',
    label: 'N : M',
    symbol: '* ◄► *',
    tooltip: 'Muchos a Muchos (N:M) - Con tabla intermedia / pivote',
  },
  {
    type: 'COMPOSITION',
    label: '◆ Comp',
    symbol: '◆──►',
    tooltip: 'Composición (Cascade Delete estricto)',
  },
  {
    type: 'AGGREGATION',
    label: '◇ Aggr',
    symbol: '◇──►',
    tooltip: 'Agregación (Parte independiente sin cascada)',
  },
  {
    type: 'INHERITANCE',
    label: '▷ Hereda',
    symbol: '───▷',
    tooltip: 'Herencia (Extends / Jerarquía de clases)',
  },
];

export const RelationshipPalette: React.FC = () => {
  const { activeRelationType, setActiveRelationType } = useDiagramStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeRelationType) {
        setActiveRelationType(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRelationType, setActiveRelationType]);

  return (
    <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
      <button
        onClick={() => setActiveRelationType(null)}
        className={`px-2 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
          activeRelationType === null
            ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-2xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
        title="Modo Selección / Puntero Normal (Esc)"
      >
        <MousePointer2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Puntero</span>
      </button>

      <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-0.5" />

      {TOOLS.map((t) => {
        const isActive = activeRelationType === t.type;
        return (
          <button
            key={t.type}
            onClick={() => setActiveRelationType(isActive ? null : t.type)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50 scale-102'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
            title={t.tooltip}
          >
            <span className="font-mono text-[11px] opacity-90">{t.symbol}</span>
            <span className="hidden md:inline">{t.label}</span>
          </button>
        );
      })}

      {activeRelationType && (
        <button
          onClick={() => setActiveRelationType(null)}
          className="ml-1 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          title="Cancelar modo conexión (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
