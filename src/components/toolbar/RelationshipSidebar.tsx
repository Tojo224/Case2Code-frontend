import React, { useState, useEffect } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { RelationshipType } from '../../types/uml';
import {
  MousePointer2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface SidebarTool {
  type: RelationshipType | null;
  label: string;
  shortLabel: string;
  symbol: string;
  badge: string;
  category: 'pointer' | 'database' | 'structural' | 'hierarchy';
  description: string;
  sqlTip: string;
}

const TOOLS: SidebarTool[] = [
  {
    type: null,
    label: 'Modo Selección',
    shortLabel: 'Puntero',
    symbol: '↖',
    badge: 'Select',
    category: 'pointer',
    description: 'Puntero normal para mover, editar y seleccionar tablas en el lienzo.',
    sqlTip: 'Atajo: Tecla Escape',
  },
  {
    type: 'ONE_TO_MANY',
    label: '1 : N (Uno a Muchos)',
    shortLabel: '1 : N',
    symbol: '1 ──► *',
    badge: '1:N',
    category: 'database',
    description: 'Un registro padre posee varios registros hijos.',
    sqlTip: 'Crea Clave Foránea (FK) en la tabla destino.',
  },
  {
    type: 'MANY_TO_ONE',
    label: 'N : 1 (Muchos a Uno)',
    shortLabel: 'N : 1',
    symbol: '* ──► 1',
    badge: 'N:1',
    category: 'database',
    description: 'Varios registros apuntan a un único registro padre.',
    sqlTip: 'Crea Clave Foránea (FK) en la tabla origen.',
  },
  {
    type: 'ONE_TO_ONE',
    label: '1 : 1 (Uno a Uno)',
    shortLabel: '1 : 1',
    symbol: '1 ──► 1',
    badge: '1:1',
    category: 'database',
    description: 'Relación exclusiva entre registros de ambas tablas.',
    sqlTip: 'Clave Foránea con restricción UNIQUE.',
  },
  {
    type: 'MANY_TO_MANY',
    label: 'N : M (Muchos a Muchos)',
    shortLabel: 'N : M',
    symbol: '* ◄► *',
    badge: 'N:M',
    category: 'database',
    description: 'Colecciones cruzadas vinculadas por tabla intermedia.',
    sqlTip: 'Genera tabla asociativa / pivote con dos FK.',
  },
  {
    type: 'COMPOSITION',
    label: 'Composición (◆)',
    shortLabel: '◆ Comp',
    symbol: '◆──►',
    badge: 'Comp',
    category: 'structural',
    description: 'Relación todo-parte estricta con eliminación en CASCADA.',
    sqlTip: 'ON DELETE CASCADE en clave foránea.',
  },
  {
    type: 'AGGREGATION',
    label: 'Agregación (◇)',
    shortLabel: '◇ Aggr',
    symbol: '◇──►',
    badge: 'Aggr',
    category: 'structural',
    description: 'Relación todo-parte independiente sin cascada.',
    sqlTip: 'ON DELETE SET NULL o RESTRICT.',
  },
  {
    type: 'INHERITANCE',
    label: 'Herencia (▷ extends)',
    shortLabel: '▷ Hereda',
    symbol: '───▷',
    badge: 'Hereda',
    category: 'hierarchy',
    description: 'Especialización y polimorfismo de tablas/entidades.',
    sqlTip: 'Estrategia JOINED o SINGLE_TABLE.',
  },
];

export const RelationshipSidebar: React.FC = () => {
  const { activeRelationType, setActiveRelationType, junctionConfig, setJunctionConfig } = useDiagramStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredTool, setHoveredTool] = useState<SidebarTool | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number }>({ top: 0 });

  // Escape key cancels connection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeRelationType) {
        setActiveRelationType(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRelationType, setActiveRelationType]);

  const handleMouseEnter = (tool: SidebarTool, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ top: rect.top });
    setHoveredTool(tool);
  };

  const handleMouseLeave = () => {
    setHoveredTool(null);
  };

  return (
    <aside
      className={`relative z-20 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-md select-none transition-all duration-200 ${
        isCollapsed ? 'w-12' : 'w-56'
      }`}
    >
      {/* Header with Collapse Toggle */}
      <div className="flex items-center justify-between px-3 h-11 border-b border-slate-100 dark:border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
            <span>Relaciones</span>
            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold px-1.5 py-0.5 rounded-full">
              DB
            </span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition mx-auto"
          title={isCollapsed ? 'Expandir panel de herramientas' : 'Colapsar panel'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Tools List */}
      <div className="flex-1 py-2 px-1.5 space-y-1 overflow-y-auto">
        {TOOLS.map((tool, idx) => {
          const isActive =
            tool.type === null
              ? activeRelationType === null
              : activeRelationType === tool.type;

          const isPointer = tool.type === null;

          return (
            <React.Fragment key={tool.label}>
              {/* Visual Divider between Pointer, DB and Structural/Hierarchy */}
              {(idx === 1 || idx === 5 || idx === 7) && (
                <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />
              )}

              <button
                type="button"
                onClick={() => setActiveRelationType(isPointer ? null : (isActive ? null : tool.type))}
                onMouseEnter={(e) => handleMouseEnter(tool, e)}
                onMouseLeave={handleMouseLeave}
                className={`w-full group relative flex items-center gap-2.5 rounded-xl transition-all duration-150 ${
                  isCollapsed ? 'justify-center p-2' : 'px-2.5 py-2'
                } ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {/* Icon / Glyph badge */}
                <div
                  className={`flex items-center justify-center font-mono font-bold rounded-lg transition-colors ${
                    isCollapsed ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-xs'
                  } ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                  }`}
                >
                  {isPointer ? (
                    <MousePointer2 className="w-4 h-4" />
                  ) : (
                    <span>{tool.badge}</span>
                  )}
                </div>

                {/* Text Label (Only when expanded) */}
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-semibold truncate leading-snug">
                      {tool.shortLabel}
                    </div>
                    <div
                      className={`text-[10px] font-mono truncate leading-none mt-0.5 ${
                        isActive ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {tool.symbol}
                    </div>
                  </div>
                )}
              </button>

              {/* Inline Junction Table Config for N:M */}
              {tool.type === 'MANY_TO_MANY' && isActive && !isCollapsed && (
                <div className="p-2.5 my-1 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1.5 text-xs animate-in fade-in duration-150">
                  <label className="flex items-center gap-2 cursor-pointer text-amber-900 dark:text-amber-200 font-semibold text-[11px]">
                    <input
                      type="checkbox"
                      checked={junctionConfig.auto}
                      onChange={(e) => setJunctionConfig({ ...junctionConfig, auto: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Tabla intermedia auto</span>
                  </label>
                  {junctionConfig.auto && (
                    <input
                      type="text"
                      placeholder="Nombre opcional (ej: a_b)"
                      value={junctionConfig.name}
                      onChange={(e) => setJunctionConfig({ ...junctionConfig, name: e.target.value })}
                      className="w-full text-[11px] px-2 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/80 rounded-md font-mono text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Footer Info / Helper */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
            <span>
              {activeRelationType
                ? 'Arrastrá entre clases (o a sí misma) para enlazar. Esc para salir.'
                : 'Elegí un tipo para activar el modo de conexión rápida.'}
            </span>
          </div>
        </div>
      )}

      {/* Rich Floating Tooltip (Appears at cursor height next to the sidebar) */}
      {hoveredTool && (
        <div
          style={{ top: Math.max(10, tooltipPos.top - 12) }}
          className={`fixed pointer-events-none z-50 animate-in fade-in duration-100 ${
            isCollapsed ? 'left-14' : 'left-58'
          }`}
        >
          <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-2xl p-3 max-w-xs border border-slate-700 dark:border-slate-600 text-xs">
            <div className="flex items-center justify-between gap-2 font-bold text-sky-300">
              <span>{hoveredTool.label}</span>
              <span className="font-mono text-[11px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-400">
                {hoveredTool.symbol}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-300 leading-relaxed">
              {hoveredTool.description}
            </p>
            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-indigo-300 font-mono">
              💡 {hoveredTool.sqlTip}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
