import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Key,
  Layers,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { Visibility } from '../../types/uml';
import { api } from '../../services/api';

const DATA_TYPES = [
  'String',
  'Long',
  'Integer',
  'Double',
  'Boolean',
  'LocalDate',
  'LocalDateTime',
];

const STEREOTYPES = ['entity', 'interface', 'service', 'repository', 'controller'];

interface AttributeRow {
  id: string;
  name: string;
  type: string;
  primary_key: boolean;
  nullable: boolean;
  visibility: Visibility;
}

export const CreateClassModal: React.FC = () => {
  const {
    isCreateClassModalOpen,
    createClassInitialPosition,
    closeCreateClassModal,
    currentDocument,
    loadDiagram,
  } = useDiagramStore();

  const [className, setClassName] = useState('');
  const [stereotype, setStereotype] = useState('entity');
  const [isAbstract, setIsAbstract] = useState(false);
  const [attributes, setAttributes] = useState<AttributeRow[]>([
    {
      id: 'default-id',
      name: 'id',
      type: 'Long',
      primary_key: true,
      nullable: false,
      visibility: 'PUBLIC',
    },
  ]);
  const [quickPasteOpen, setQuickPasteOpen] = useState(false);
  const [quickPasteText, setQuickPasteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const classNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreateClassModalOpen) {
      setClassName('');
      setStereotype('entity');
      setIsAbstract(false);
      setAttributes([
        {
          id: `attr-${Date.now()}-1`,
          name: 'id',
          type: 'Long',
          primary_key: true,
          nullable: false,
          visibility: 'PUBLIC',
        },
      ]);
      setQuickPasteOpen(false);
      setQuickPasteText('');
      setValidationError(null);
      setTimeout(() => classNameInputRef.current?.focus(), 50);
    }
  }, [isCreateClassModalOpen]);

  if (!isCreateClassModalOpen) return null;

  const handleAddAttributeRow = () => {
    setAttributes((prev) => [
      ...prev,
      {
        id: `attr-${Date.now()}-${prev.length + 1}`,
        name: '',
        type: 'String',
        primary_key: false,
        nullable: true,
        visibility: 'PUBLIC',
      },
    ]);
  };

  const handleRemoveAttributeRow = (id: string) => {
    setAttributes((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAttributeChange = (
    id: string,
    field: keyof AttributeRow,
    value: any
  ) => {
    setAttributes((prev) =>
      prev.map((attr) => {
        if (attr.id === id) {
          return { ...attr, [field]: value };
        }
        // If primary key set to true, unset others
        if (field === 'primary_key' && value === true) {
          return { ...attr, primary_key: false };
        }
        return attr;
      })
    );
  };

  const handleQuickPasteParse = () => {
    if (!quickPasteText.trim()) return;

    // Splits by lines or commas
    const tokens = quickPasteText
      .split(/[\n,;]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const parsedRows: AttributeRow[] = [];

    tokens.forEach((token, idx) => {
      // Formats like: "nombre: String", "precio Double", "id Long PK", "activo: Boolean"
      const clean = token.replace(/[()]/g, ' ').trim();
      const parts = clean.split(/[:\s]+/).filter(Boolean);
      if (parts.length === 0) return;

      const rawName = parts[0].trim();
      const rawType = parts[1]?.trim() || '';
      const isPk = /^(pk|id|primary)$/i.test(token) || rawName.toLowerCase() === 'id';

      // Match type
      let matchedType = 'String';
      const lt = rawType.toLowerCase();
      if (/^(long|bigint)/.test(lt) || (rawName.toLowerCase() === 'id' && !rawType)) matchedType = 'Long';
      else if (/^(int|integer)/.test(lt)) matchedType = 'Integer';
      else if (/^(double|decimal|float)/.test(lt)) matchedType = 'Double';
      else if (/^(bool|boolean)/.test(lt)) matchedType = 'Boolean';
      else if (/^(date|localdate)/.test(lt)) matchedType = 'LocalDate';
      else if (/^(datetime|timestamp)/.test(lt)) matchedType = 'LocalDateTime';

      parsedRows.push({
        id: `attr-parsed-${Date.now()}-${idx}`,
        name: rawName,
        type: matchedType,
        primary_key: isPk,
        nullable: !isPk,
        visibility: 'PUBLIC',
      });
    });

    if (parsedRows.length > 0) {
      setAttributes(parsedRows);
      setQuickPasteOpen(false);
      setQuickPasteText('');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentDocument) return;

    const trimmedName = className.trim();
    if (!trimmedName) {
      setValidationError('Ingresá un nombre para la clase.');
      classNameInputRef.current?.focus();
      return;
    }

    // Sanitize PascalCase
    const formattedName =
      trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);

    // Filter valid attributes
    const validAttrs = attributes.filter((a) => a.name.trim().length > 0);

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const classId = `cls-${Math.random().toString(36).substring(2, 9)}`;
      const position = createClassInitialPosition || {
        x: 150 + Math.floor(Math.random() * 80),
        y: 150 + Math.floor(Math.random() * 80),
      };

      // 1. Create Class
      const createRes = await api.executeCommand(currentDocument.id, {
        command_type: 'CREATE_CLASS',
        class_id: classId,
        name: formattedName,
        position,
        is_abstract: isAbstract,
        stereotype: stereotype.trim() || undefined,
      });

      let updatedDoc = createRes.document;
      const createdClass = updatedDoc.classes.find((c) => c.id === classId);
      const defaultAttr = createdClass?.attributes[0];

      // 2. Process attributes
      if (validAttrs.length > 0 && defaultAttr) {
        const firstAttr = validAttrs[0];

        // If the first attr is different from the default "id: Long", update it
        if (
          firstAttr.name !== defaultAttr.name ||
          firstAttr.type !== defaultAttr.type ||
          firstAttr.primary_key !== defaultAttr.primary_key ||
          firstAttr.nullable !== defaultAttr.nullable ||
          firstAttr.visibility !== defaultAttr.visibility
        ) {
          const updateRes = await api.executeCommand(updatedDoc.id, {
            command_type: 'UPDATE_ATTRIBUTE',
            class_id: classId,
            attribute_id: defaultAttr.id,
            name: firstAttr.name.trim(),
            type: firstAttr.type,
            primary_key: firstAttr.primary_key,
            nullable: firstAttr.nullable,
            visibility: firstAttr.visibility,
          });
          updatedDoc = updateRes.document;
        }

        // Add the rest of the attributes (index 1..N)
        for (let i = 1; i < validAttrs.length; i++) {
          const attr = validAttrs[i];
          const addRes = await api.executeCommand(updatedDoc.id, {
            command_type: 'ADD_ATTRIBUTE',
            class_id: classId,
            name: attr.name.trim(),
            type: attr.type,
            primary_key: attr.primary_key,
            nullable: attr.nullable,
            visibility: attr.visibility,
          });
          updatedDoc = addRes.document;
        }
      } else if (validAttrs.length === 0 && defaultAttr) {
        // If user explicitly deleted all attributes, remove default attr
        const delRes = await api.executeCommand(updatedDoc.id, {
          command_type: 'DELETE_ATTRIBUTE',
          class_id: classId,
          attribute_id: defaultAttr.id,
        });
        updatedDoc = delRes.document;
      }

      // Sync state and reload diagram
      await loadDiagram(updatedDoc.id);
      closeCreateClassModal();
    } catch (err: any) {
      setValidationError(err?.message || 'Error al crear la clase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeCreateClassModal();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Nueva Clase / Entidad UML
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configurá el nombre, estereotipo y columnas de la tabla
              </p>
            </div>
          </div>
          <button
            onClick={closeCreateClassModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {validationError && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
              {validationError}
            </div>
          )}

          {/* Class Name & Stereotype Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre de la Clase *
              </label>
              <input
                ref={classNameInputRef}
                type="text"
                placeholder="ej. Cliente, Pedido, Factura"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                required
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estereotipo
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ej. entity"
                  value={stereotype}
                  onChange={(e) => setStereotype(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Stereotype Quick Chips & Abstract Checkbox */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Sugerencias:
              </span>
              {STEREOTYPES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStereotype(st)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                    stereotype === st
                      ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  «{st}»
                </button>
              ))}
            </div>

            <label className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAbstract}
                onChange={(e) => setIsAbstract(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
              />
              <span>Clase Abstracta</span>
            </label>
          </div>

          {/* Attributes Compartment Header */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Atributos ({attributes.length})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setQuickPasteOpen(!quickPasteOpen)}
                  className="text-[11px] flex items-center space-x-1 text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 transition"
                  title="Pegar lista de atributos en formato texto"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Pegar texto / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddAttributeRow}
                  className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center space-x-1 px-2 py-1 rounded bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Atributo</span>
                </button>
              </div>
            </div>

            {/* Quick Paste Collapse Drawer */}
            {quickPasteOpen && (
              <div className="mb-3 p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Pegá tus atributos separados por coma o saltos de línea (ej.{' '}
                  <code className="text-sky-600 dark:text-sky-400">
                    nombre: String, precio: Double, fecha: LocalDate
                  </code>
                  ):
                </p>
                <textarea
                  rows={2}
                  value={quickPasteText}
                  onChange={(e) => setQuickPasteText(e.target.value)}
                  placeholder="nombre: String, email: String, telefono: String..."
                  className="w-full text-xs font-mono p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setQuickPasteOpen(false)}
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickPasteParse}
                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded shadow-xs"
                  >
                    Cargar Atributos
                  </button>
                </div>
              </div>
            )}

            {/* Attributes Table / Rows */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {attributes.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  Sin atributos definidos. Hacé clic en "+ Atributo" para agregar uno.
                </div>
              ) : (
                attributes.map((attr) => (
                  <div
                    key={attr.id}
                    className="flex items-center space-x-2 p-1.5 bg-slate-50/70 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-750 group hover:border-slate-300 dark:hover:border-slate-600 transition"
                  >
                    {/* PK Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        handleAttributeChange(
                          attr.id,
                          'primary_key',
                          !attr.primary_key
                        )
                      }
                      title={attr.primary_key ? 'Clave Primaria (PK)' : 'Marcar como PK'}
                      className={`p-1 rounded transition shrink-0 ${
                        attr.primary_key
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400'
                          : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
                      }`}
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>

                    {/* Name Input */}
                    <input
                      type="text"
                      placeholder="nombreAtributo"
                      value={attr.name}
                      onChange={(e) =>
                        handleAttributeChange(attr.id, 'name', e.target.value)
                      }
                      className="w-1/3 text-xs font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />

                    {/* Type Dropdown */}
                    <select
                      value={attr.type}
                      onChange={(e) =>
                        handleAttributeChange(attr.id, 'type', e.target.value)
                      }
                      className="w-1/3 text-xs font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      {DATA_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    {/* Visibility Dropdown */}
                    <select
                      value={attr.visibility}
                      onChange={(e) =>
                        handleAttributeChange(
                          attr.id,
                          'visibility',
                          e.target.value as Visibility
                        )
                      }
                      className="w-20 text-[11px] font-mono px-1 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="PUBLIC">+ Public</option>
                      <option value="PRIVATE">- Private</option>
                      <option value="PROTECTED"># Protected</option>
                    </select>

                    {/* Nullable Checkbox */}
                    <label
                      title="Permite nulos"
                      className="flex items-center space-x-1 text-[10px] text-slate-500 cursor-pointer select-none shrink-0"
                    >
                      <input
                        type="checkbox"
                        checked={attr.nullable}
                        disabled={attr.primary_key}
                        onChange={(e) =>
                          handleAttributeChange(
                            attr.id,
                            'nullable',
                            e.target.checked
                          )
                        }
                        className="rounded border-slate-300 text-sky-600 focus:ring-0 w-3 h-3 disabled:opacity-40"
                      />
                      <span className="hidden sm:inline">Null</span>
                    </label>

                    {/* Delete Row */}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttributeRow(attr.id)}
                      title="Eliminar atributo"
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Tip: Presioná <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-[10px]">Ctrl+Enter</kbd> para guardar
            </span>
            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={closeCreateClassModal}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <span>Creando...</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Crear Clase</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
