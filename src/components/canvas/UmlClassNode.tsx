import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Key, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { UmlClass, UmlAttribute } from '../../types/uml';
import { useDiagramStore } from '../../store/useDiagramStore';

const DATA_TYPES = [
  'String',
  'Long',
  'Integer',
  'Double',
  'Boolean',
  'LocalDate',
  'LocalDateTime',
];

export const UmlClassNode = memo(({ data, selected }: NodeProps & { data: UmlClass }) => {
  const { dispatchCommand, setSelectedClass, activeRelationType } = useDiagramStore();

  const isConnecting = Boolean(activeRelationType);
  const handleClass = `!w-2.5 !h-2.5 !bg-sky-500 !border-2 !border-white dark:!border-slate-900 hover:!scale-150 transition-all duration-150 cursor-crosshair ${
    isConnecting
      ? '!opacity-100 !ring-2 !ring-sky-400/60'
      : 'opacity-40 group-hover/node:opacity-100 hover:!opacity-100'
  }`;

  // Class Name inline editing
  const [isEditingClassName, setIsEditingClassName] = useState(false);
  const [editClassName, setEditClassName] = useState(data.name);
  const classNameInputRef = useRef<HTMLInputElement>(null);

  // New Attribute inline form
  const [isAddingAttribute, setIsAddingAttribute] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrType, setNewAttrType] = useState('String');
  const [newAttrPk, setNewAttrPk] = useState(false);
  const newAttrInputRef = useRef<HTMLInputElement>(null);

  // Existing Attribute inline editing
  const [editingAttrId, setEditingAttrId] = useState<string | null>(null);
  const [editAttrName, setEditAttrName] = useState('');
  const [editAttrType, setEditAttrType] = useState('String');
  const [editAttrPk, setEditAttrPk] = useState(false);
  const editAttrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditClassName(data.name);
  }, [data.name]);

  useEffect(() => {
    if (isEditingClassName) {
      classNameInputRef.current?.focus();
      classNameInputRef.current?.select();
    }
  }, [isEditingClassName]);

  useEffect(() => {
    if (isAddingAttribute) {
      newAttrInputRef.current?.focus();
    }
  }, [isAddingAttribute]);

  useEffect(() => {
    if (editingAttrId) {
      editAttrInputRef.current?.focus();
      editAttrInputRef.current?.select();
    }
  }, [editingAttrId]);

  // Handle Class Delete
  const handleDeleteClass = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`¿Eliminar la clase "${data.name}" y todas sus relaciones asociadas?`)) {
      dispatchCommand({
        command_type: 'DELETE_CLASS',
        class_id: data.id,
      });
    }
  };

  // Handle Class Rename Save
  const handleSaveClassName = () => {
    const trimmed = editClassName.trim();
    if (trimmed && trimmed !== data.name) {
      dispatchCommand({
        command_type: 'RENAME_CLASS',
        class_id: data.id,
        new_name: trimmed,
      });
    } else {
      setEditClassName(data.name);
    }
    setIsEditingClassName(false);
  };

  // Handle Attribute Delete
  const handleDeleteAttribute = (e: React.MouseEvent, attrId: string) => {
    e.stopPropagation();
    dispatchCommand({
      command_type: 'DELETE_ATTRIBUTE',
      class_id: data.id,
      attribute_id: attrId,
    });
  };

  // Handle Inline Add Attribute
  const handleSaveNewAttribute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newAttrName.trim();
    if (!trimmed) return;

    dispatchCommand({
      command_type: 'ADD_ATTRIBUTE',
      class_id: data.id,
      name: trimmed,
      type: newAttrType,
      primary_key: newAttrPk,
      nullable: !newAttrPk,
    });

    setNewAttrName('');
    setNewAttrPk(false);
    // Keep adding form open for rapid multi-attribute entry
    newAttrInputRef.current?.focus();
  };

  // Start editing existing attribute
  const handleStartEditAttribute = (attr: UmlAttribute, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAttrId(attr.id);
    setEditAttrName(attr.name);
    setEditAttrType(attr.type);
    setEditAttrPk(attr.primary_key);
  };

  // Save existing attribute edit
  const handleSaveEditAttribute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingAttrId) return;
    const trimmed = editAttrName.trim();
    if (!trimmed) return;

    dispatchCommand({
      command_type: 'UPDATE_ATTRIBUTE',
      class_id: data.id,
      attribute_id: editingAttrId,
      name: trimmed,
      type: editAttrType,
      primary_key: editAttrPk,
      nullable: !editAttrPk,
    });

    setEditingAttrId(null);
  };

  return (
    <div
      onClick={() => setSelectedClass(data)}
      className={`group/node min-w-[230px] max-w-[320px] bg-white dark:bg-slate-900 rounded-lg shadow-md border-2 transition-all duration-150 relative ${
        selected
          ? 'border-sky-500 shadow-sky-100 dark:shadow-sky-950/40 shadow-lg'
          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
      }`}
    >
      {/* --- TOP BORDER HANDLES (3 points: Left 25%, Center 50%, Right 75%) --- */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-left-target"
        style={{ left: '25%' }}
        className={handleClass}
        title="Conexión Superior Izquierda"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-left-source"
        style={{ left: '25%' }}
        className={handleClass}
        title="Conexión Superior Izquierda"
      />

      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{ left: '50%' }}
        className={handleClass}
        title="Conexión Superior Central"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{ left: '50%' }}
        className={handleClass}
        title="Conexión Superior Central"
      />

      <Handle
        type="target"
        position={Position.Top}
        id="top-right-target"
        style={{ left: '75%' }}
        className={handleClass}
        title="Conexión Superior Derecha"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-right-source"
        style={{ left: '75%' }}
        className={handleClass}
        title="Conexión Superior Derecha"
      />

      {/* --- RIGHT BORDER HANDLES (3 points: Top 25%, Center 50%, Bottom 75%) --- */}
      <Handle
        type="target"
        position={Position.Right}
        id="right-top-target"
        style={{ top: '25%' }}
        className={handleClass}
        title="Conexión Derecha Superior"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-top-source"
        style={{ top: '25%' }}
        className={handleClass}
        title="Conexión Derecha Superior"
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ top: '50%' }}
        className={handleClass}
        title="Conexión Derecha Central"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ top: '50%' }}
        className={handleClass}
        title="Conexión Derecha Central"
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right-bottom-target"
        style={{ top: '75%' }}
        className={handleClass}
        title="Conexión Derecha Inferior"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-bottom-source"
        style={{ top: '75%' }}
        className={handleClass}
        title="Conexión Derecha Inferior"
      />

      {/* --- BOTTOM BORDER HANDLES (3 points: Left 25%, Center 50%, Right 75%) --- */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-left-target"
        style={{ left: '25%' }}
        className={handleClass}
        title="Conexión Inferior Izquierda"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-left-source"
        style={{ left: '25%' }}
        className={handleClass}
        title="Conexión Inferior Izquierda"
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{ left: '50%' }}
        className={handleClass}
        title="Conexión Inferior Central"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{ left: '50%' }}
        className={handleClass}
        title="Conexión Inferior Central"
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-right-target"
        style={{ left: '75%' }}
        className={handleClass}
        title="Conexión Inferior Derecha"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-right-source"
        style={{ left: '75%' }}
        className={handleClass}
        title="Conexión Inferior Derecha"
      />

      {/* --- LEFT BORDER HANDLES (3 points: Top 25%, Center 50%, Bottom 75%) --- */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-top-target"
        style={{ top: '25%' }}
        className={handleClass}
        title="Conexión Izquierda Superior"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-top-source"
        style={{ top: '25%' }}
        className={handleClass}
        title="Conexión Izquierda Superior"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ top: '50%' }}
        className={handleClass}
        title="Conexión Izquierda Central"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ top: '50%' }}
        className={handleClass}
        title="Conexión Izquierda Central"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left-bottom-target"
        style={{ top: '75%' }}
        className={handleClass}
        title="Conexión Izquierda Inferior"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-bottom-source"
        style={{ top: '75%' }}
        className={handleClass}
        title="Conexión Izquierda Inferior"
      />

      {/* Class Header */}
      <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 border-b border-slate-200 dark:border-slate-700 rounded-t-md flex items-center justify-between">
        <div className="flex flex-col flex-1 min-w-0 mr-2">
          {data.stereotype && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider truncate">
              «{data.stereotype}»
            </span>
          )}
          {isEditingClassName ? (
            <input
              ref={classNameInputRef}
              type="text"
              value={editClassName}
              onChange={(e) => setEditClassName(e.target.value)}
              onBlur={handleSaveClassName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveClassName();
                if (e.key === 'Escape') {
                  setEditClassName(data.name);
                  setIsEditingClassName(false);
                }
              }}
              className="text-xs font-bold px-1.5 py-0.5 rounded border border-sky-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingClassName(true);
              }}
              title="Doble clic para renombrar"
              className={`font-bold text-sm text-slate-800 dark:text-slate-100 truncate cursor-text ${
                data.is_abstract ? 'italic' : ''
              }`}
            >
              {data.name}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingClassName(true);
            }}
            title="Renombrar clase"
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDeleteClass}
            title="Eliminar clase"
            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Attributes List */}
      <div className="px-3 py-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
        {data.attributes.length === 0 ? (
          <div className="text-slate-400 dark:text-slate-500 italic text-[11px] py-1 text-center">
            Sin atributos
          </div>
        ) : (
          data.attributes.map((attr) => {
            const isEditingThis = editingAttrId === attr.id;

            if (isEditingThis) {
              return (
                <form
                  key={attr.id}
                  onSubmit={handleSaveEditAttribute}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded border border-sky-500 space-y-1"
                >
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setEditAttrPk(!editAttrPk)}
                      title={editAttrPk ? 'Clave Primaria' : 'Hacer PK'}
                      className={`p-1 rounded text-xs transition shrink-0 ${
                        editAttrPk
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400'
                          : 'text-slate-400 hover:text-amber-500'
                      }`}
                    >
                      <Key className="w-3 h-3" />
                    </button>
                    <input
                      ref={editAttrInputRef}
                      type="text"
                      value={editAttrName}
                      onChange={(e) => setEditAttrName(e.target.value)}
                      placeholder="nombre"
                      className="w-full text-[11px] font-mono px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                    <select
                      value={editAttrType}
                      onChange={(e) => setEditAttrType(e.target.value)}
                      className="text-[10px] font-mono px-1 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      {DATA_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-end space-x-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditingAttrId(null)}
                      className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="submit"
                      className="p-0.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={attr.id}
                onDoubleClick={(e) => handleStartEditAttribute(attr, e)}
                title="Doble clic para editar atributo"
                className="group flex items-center justify-between py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 px-1 rounded transition cursor-pointer"
              >
                <div className="flex items-center space-x-1.5 font-mono min-w-0 mr-1">
                  {attr.primary_key ? (
                    <Key className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 text-xs w-3 text-center shrink-0">
                      {attr.visibility === 'PUBLIC' ? '+' : '-'}
                    </span>
                  )}
                  <span
                    className={`truncate ${
                      attr.primary_key
                        ? 'font-semibold text-slate-900 dark:text-slate-100'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {attr.name}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] shrink-0">
                    : {attr.type}
                  </span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-0.5 shrink-0 transition">
                  <button
                    onClick={(e) => handleStartEditAttribute(attr, e)}
                    title="Editar atributo"
                    className="p-0.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteAttribute(e, attr.id)}
                    title="Eliminar atributo"
                    className="p-0.5 text-slate-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Attribute Footer */}
      <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded-b-md">
        {isAddingAttribute ? (
          <form
            onSubmit={handleSaveNewAttribute}
            onClick={(e) => e.stopPropagation()}
            className="space-y-1.5 py-1"
          >
            <div className="flex items-center space-x-1">
              <input
                ref={newAttrInputRef}
                type="text"
                placeholder="nombre (ej. precio)"
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsAddingAttribute(false);
                }}
                className="w-full text-xs font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <select
                value={newAttrType}
                onChange={(e) => setNewAttrType(e.target.value)}
                className="text-[11px] font-mono px-1 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {DATA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center space-x-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newAttrPk}
                  onChange={(e) => setNewAttrPk(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 w-3 h-3"
                />
                <span>PK</span>
              </label>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setIsAddingAttribute(false)}
                  className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newAttrName.trim()}
                  className="px-2.5 py-0.5 text-[11px] font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-40 rounded shadow-xs"
                >
                  Agregar
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAddingAttribute(true);
            }}
            className="w-full text-left text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium flex items-center space-x-1 hover:underline transition"
          >
            <Plus className="w-3 h-3" />
            <span>+ Agregar atributo</span>
          </button>
        )}
      </div>
    </div>
  );
});
