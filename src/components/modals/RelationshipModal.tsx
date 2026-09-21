import React, { useState, useEffect } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { RelationshipType } from '../../types/uml';
import {
  GitCommit,
  X,
  Info,
  ArrowLeftRight,
  Layers,
  AlertCircle,
  Trash2,
  Check,
} from 'lucide-react';

interface RelationshipOption {
  id: RelationshipType;
  label: string;
  category: 'database' | 'structural' | 'hierarchy';
  symbol: string;
  description: string;
  defaultSourceCard: string;
  defaultTargetCard: string;
}

const RELATIONSHIP_OPTIONS: RelationshipOption[] = [
  // Database Associations
  {
    id: 'ONE_TO_MANY',
    label: '1 : N (Uno a Muchos)',
    category: 'database',
    symbol: '1 ──────► *',
    description: 'La entidad origen posee una colección de destinos (ej: Departamento tiene Empleados).',
    defaultSourceCard: '1',
    defaultTargetCard: '*',
  },
  {
    id: 'MANY_TO_ONE',
    label: 'N : 1 (Muchos a Uno)',
    category: 'database',
    symbol: '* ──────► 1',
    description: 'Múltiples registros referencian a un único registro padre mediante Clave Foránea (FK).',
    defaultSourceCard: '*',
    defaultTargetCard: '1',
  },
  {
    id: 'ONE_TO_ONE',
    label: '1 : 1 (Uno a Uno)',
    category: 'database',
    symbol: '1 ──────► 1',
    description: 'Cada registro se asocia exclusivamente a un único registro de la otra tabla (FK única).',
    defaultSourceCard: '1',
    defaultTargetCard: '1',
  },
  {
    id: 'MANY_TO_MANY',
    label: 'N : M (Muchos a Muchos)',
    category: 'database',
    symbol: '* ◄────► *',
    description: 'Relación bidireccional vinculada a través de una tabla intermedia / pivote.',
    defaultSourceCard: '*',
    defaultTargetCard: '*',
  },
  // Structural (Whole-Part)
  {
    id: 'COMPOSITION',
    label: 'Composición (◆)',
    category: 'structural',
    symbol: '◆──────►',
    description: 'Ciclo de vida estricto (owns-a). Si se elimina el padre, los hijos se eliminan en CASCADA.',
    defaultSourceCard: '1',
    defaultTargetCard: '*',
  },
  {
    id: 'AGGREGATION',
    label: 'Agregación (◇)',
    category: 'structural',
    symbol: '◇──────►',
    description: 'Relación todo-parte compartida (has-a). La parte puede existir independientemente del contenedor.',
    defaultSourceCard: '1',
    defaultTargetCard: '*',
  },
  // Hierarchy
  {
    id: 'INHERITANCE',
    label: 'Herencia (▷ extends)',
    category: 'hierarchy',
    symbol: '───────▷',
    description: 'La subclase hereda atributos y comportamiento de la superclase.',
    defaultSourceCard: '',
    defaultTargetCard: '',
  },
  {
    id: 'REALIZATION',
    label: 'Realización (··▷ implements)',
    category: 'hierarchy',
    symbol: '· · · · ▷',
    description: 'La clase implementa el contrato de una interfaz abstracta.',
    defaultSourceCard: '',
    defaultTargetCard: '',
  },
  {
    id: 'DEPENDENCY',
    label: 'Dependencia (··> uses)',
    category: 'hierarchy',
    symbol: '· · · · >',
    description: 'Uso temporal o inyección de dependencia entre componentes.',
    defaultSourceCard: '',
    defaultTargetCard: '',
  },
];

export const RelationshipModal: React.FC = () => {
  const {
    editingRelationship,
    setEditingRelationship,
    currentDocument,
    dispatchCommand,
  } = useDiagramStore();

  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [sourceHandle, setSourceHandle] = useState<string | undefined>(undefined);
  const [targetHandle, setTargetHandle] = useState<string | undefined>(undefined);

  const [selectedType, setSelectedType] = useState<RelationshipType>('ONE_TO_MANY');
  const [sourceCard, setSourceCard] = useState<string>('1');
  const [targetCard, setTargetCard] = useState<string>('*');
  const [sourceRole, setSourceRole] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('');
  const [isSwapped, setIsSwapped] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Sync state when editingRelationship opens
  useEffect(() => {
    if (editingRelationship) {
      setModalError(null);
      setIsSwapped(false);
      setSourceId(editingRelationship.source_class_id);
      setTargetId(editingRelationship.target_class_id);
      setSourceHandle(editingRelationship.source_handle || undefined);
      setTargetHandle(editingRelationship.target_handle || undefined);

      setSelectedType(editingRelationship.type);
      setSourceCard(editingRelationship.source_cardinality || '1');
      setTargetCard(editingRelationship.target_cardinality || '*');
      setSourceRole(editingRelationship.source_role || '');
      setTargetRole(editingRelationship.target_role || '');
    }
  }, [editingRelationship]);

  if (!editingRelationship || !currentDocument) return null;

  const sourceClass = currentDocument.classes.find((c) => c.id === sourceId);
  const targetClass = currentDocument.classes.find((c) => c.id === targetId);

  if (!sourceClass || !targetClass) return null;

  const isSelf = sourceId === targetId;
  const currentOption = RELATIONSHIP_OPTIONS.find((o) => o.id === selectedType) || RELATIONSHIP_OPTIONS[0];
  const isMultiplicityApplicable = selectedType !== 'INHERITANCE' && selectedType !== 'REALIZATION' && selectedType !== 'DEPENDENCY';

  // Swap Direction Handler (Volcar relación A ⇄ B)
  const handleSwapDirection = () => {
    setModalError(null);
    if (isSelf) {
      const tmpRole = sourceRole;
      setSourceRole(targetRole);
      setTargetRole(tmpRole);
      const tmpCard = sourceCard;
      setSourceCard(targetCard);
      setTargetCard(tmpCard);
      return;
    }

    const nextSourceId = targetId;
    const nextTargetId = sourceId;
    const nextSourceHandle = targetHandle;
    const nextTargetHandle = sourceHandle;

    setSourceId(nextSourceId);
    setTargetId(nextTargetId);
    setSourceHandle(nextSourceHandle);
    setTargetHandle(nextTargetHandle);

    // Swap cardinalities and roles
    const tmpCard = sourceCard;
    setSourceCard(targetCard);
    setTargetCard(tmpCard);

    const tmpRole = sourceRole;
    setSourceRole(targetRole);
    setTargetRole(tmpRole);

    setIsSwapped(!isSwapped);
  };

  const handleSelectType = (option: RelationshipOption) => {
    setModalError(null);
    if (isSelf && (option.id === 'INHERITANCE' || option.id === 'REALIZATION')) {
      setModalError('Una clase no puede heredar o implementar de sí misma. Selecciona una relación asociativa.');
      return;
    }
    setSelectedType(option.id);
    setSourceCard(option.defaultSourceCard);
    setTargetCard(option.defaultTargetCard);
  };

  const handleSave = async () => {
    try {
      setModalError(null);

      if (isSelf && (selectedType === 'INHERITANCE' || selectedType === 'REALIZATION')) {
        setModalError('Una clase o tabla no puede heredar o implementar de sí misma.');
        return;
      }

      if (isSelf && sourceRole.trim() && targetRole.trim() && sourceRole.trim().toLowerCase() === targetRole.trim().toLowerCase()) {
        setModalError('En una relación recursiva, el rol origen y destino deben tener nombres distintos (ej: "subordinados" y "padre").');
        return;
      }

      // If direction was swapped, recreate relationship with new source and target
      if (isSwapped) {
        await dispatchCommand({
          command_type: 'DELETE_RELATIONSHIP',
          relationship_id: editingRelationship.id,
        });

        await dispatchCommand({
          command_type: 'CREATE_RELATIONSHIP',
          source_class_id: sourceId,
          target_class_id: targetId,
          source_handle: isSelf ? 'right-source' : sourceHandle,
          target_handle: isSelf ? 'bottom-target' : targetHandle,
          type: selectedType,
          source_cardinality: isMultiplicityApplicable ? sourceCard || '1' : '',
          target_cardinality: isMultiplicityApplicable ? targetCard || '1' : '',
          source_role: sourceRole.trim() || undefined,
          target_role: targetRole.trim() || undefined,
        });
      } else {
        // Direct update
        await dispatchCommand({
          command_type: 'UPDATE_RELATIONSHIP',
          relationship_id: editingRelationship.id,
          type: selectedType,
          source_cardinality: isMultiplicityApplicable ? sourceCard || '1' : '',
          target_cardinality: isMultiplicityApplicable ? targetCard || '1' : '',
          source_role: sourceRole.trim() || null,
          target_role: targetRole.trim() || null,
        });
      }

      setEditingRelationship(null);
    } catch (err: any) {
      setModalError(err?.message || 'Error al guardar los cambios en la relación.');
    }
  };

  const handleDelete = async () => {
    if (confirm(`¿Eliminar la relación entre ${sourceClass.name} y ${targetClass.name}?`)) {
      try {
        await dispatchCommand({
          command_type: 'DELETE_RELATIONSHIP',
          relationship_id: editingRelationship.id,
        });
        setEditingRelationship(null);
      } catch (err: any) {
        setModalError(err?.message || 'Error al eliminar la relación');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
          <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-100 font-semibold text-sm">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg">
              <GitCommit className="w-4 h-4" />
            </div>
            <span>Editar Relación</span>
          </div>
          <button
            onClick={() => setEditingRelationship(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Visual Diagram Preview with SWAP Button */}
          <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-xl p-4 shadow-inner border border-slate-800">
            <div className="flex items-center justify-between gap-3 font-mono text-sm">
              {/* Source Node */}
              <div className="flex-1 text-center bg-slate-800/90 border border-slate-700 px-3 py-2 rounded-lg text-sky-300 font-bold truncate">
                {sourceClass.name}
              </div>

              {/* Center Flow / Swap Button */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleSwapDirection}
                  disabled={isSelf}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/50 hover:border-indigo-400 rounded-full text-indigo-200 text-xs font-sans transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title={isSelf ? 'Auto-referencia (misma clase)' : 'Volcar / Invertir sentido (A ⇄ B)'}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span className="font-semibold text-[11px]">Volcar Sentido</span>
                </button>
                <span className="text-amber-400 font-bold tracking-widest text-base mt-1">
                  {currentOption.symbol}
                </span>
                {isMultiplicityApplicable && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {sourceCard || '1'} : {targetCard || '*'}
                  </span>
                )}
              </div>

              {/* Target Node */}
              <div className="flex-1 text-center bg-slate-800/90 border border-slate-700 px-3 py-2 rounded-lg text-emerald-300 font-bold truncate">
                {targetClass.name}
              </div>
            </div>

            {isSelf && (
              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-center gap-1.5 text-xs text-amber-400 font-sans">
                <Layers className="w-3.5 h-3.5" />
                <span>Relación Recursiva / Auto-referencial (se apunta a sí misma)</span>
              </div>
            )}

            <p className="mt-2.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2 flex items-start space-x-1.5 font-sans">
              <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>{currentOption.description}</span>
            </p>
          </div>

          {/* Quick Relationship Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Tipo de Relación
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {RELATIONSHIP_OPTIONS.map((item) => {
                const isSelected = selectedType === item.id;
                const isDisabled = isSelf && (item.id === 'INHERITANCE' || item.id === 'REALIZATION');
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectType(item)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isDisabled
                        ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850'
                        : isSelected
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-300 dark:ring-indigo-800'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>{item.label}</span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-normal">
                        {isDisabled ? 'No recursivo' : item.symbol}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multiplicity Configuration */}
          {isMultiplicityApplicable && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 truncate">
                  Cardinalidad en {sourceClass.name} (Origen)
                </label>
                <select
                  value={sourceCard}
                  onChange={(e) => setSourceCard(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1">1 (Uno obligatorio)</option>
                  <option value="*">* (Muchos)</option>
                  <option value="0..1">0..1 (Cero o Uno)</option>
                  <option value="1..*">1..* (Uno o Más)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 truncate">
                  Cardinalidad en {targetClass.name} (Destino)
                </label>
                <select
                  value={targetCard}
                  onChange={(e) => setTargetCard(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="*">* (Muchos)</option>
                  <option value="1">1 (Uno obligatorio)</option>
                  <option value="0..1">0..1 (Cero o Uno)</option>
                  <option value="1..*">1..* (Uno o Más)</option>
                </select>
              </div>
            </div>
          )}

          {/* Roles / Nombres de campo FK (Opcional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Rol / Nombre de FK en {sourceClass.name} (opcional)
              </label>
              <input
                type="text"
                placeholder={isSelf ? 'subordinados' : 'ej: pedidos'}
                value={sourceRole}
                onChange={(e) => setSourceRole(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Rol / Nombre de FK en {targetClass.name} (opcional)
              </label>
              <input
                type="text"
                placeholder={isSelf ? 'padre / supervisor' : 'ej: cliente'}
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Error Alert */}
        {modalError && (
          <div className="mx-6 mb-2 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{modalError}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
            title="Eliminar esta relación"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar Relación</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setEditingRelationship(null)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
