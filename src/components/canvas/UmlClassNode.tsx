import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Key, Plus, Trash2, Edit2 } from 'lucide-react';
import { UmlClass } from '../../types/uml';
import { useDiagramStore } from '../../store/useDiagramStore';

export const UmlClassNode = memo(({ data, selected }: NodeProps & { data: UmlClass }) => {
  const { dispatchCommand, setSelectedClass } = useDiagramStore();

  const handleDeleteClass = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete class "${data.name}" and all its relationships?`)) {
      dispatchCommand({
        command_type: 'DELETE_CLASS',
        class_id: data.id,
      });
    }
  };

  const handleDeleteAttribute = (e: React.MouseEvent, attrId: string) => {
    e.stopPropagation();
    dispatchCommand({
      command_type: 'DELETE_ATTRIBUTE',
      class_id: data.id,
      attribute_id: attrId,
    });
  };

  const handleAddAttributeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const attrName = prompt('Enter attribute name:');
    if (!attrName || !attrName.trim()) return;
    const attrType = prompt('Enter attribute type (String, Long, Integer, Double, Boolean, LocalDate):', 'String');
    if (!attrType) return;

    dispatchCommand({
      command_type: 'ADD_ATTRIBUTE',
      class_id: data.id,
      name: attrName.trim(),
      type: attrType.trim(),
      primary_key: false,
      nullable: true,
    });
  };

  return (
    <div
      onClick={() => setSelectedClass(data)}
      className={`min-w-[220px] bg-white rounded-lg shadow-md border-2 transition-all duration-150 ${
        selected ? 'border-sky-500 shadow-sky-100 shadow-lg' : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      {/* Handles for incoming and outgoing connections */}
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-sky-500" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-sky-500" />
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-sky-500" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-sky-500" />

      {/* Class Header */}
      <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 rounded-t-md flex items-center justify-between">
        <div className="flex flex-col">
          {data.stereotype && (
            <span className="text-[10px] text-slate-500 font-mono tracking-wider">
              «{data.stereotype}»
            </span>
          )}
          <span className={`font-bold text-sm text-slate-800 ${data.is_abstract ? 'italic' : ''}`}>
            {data.name}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newName = prompt('Rename class to:', data.name);
              if (newName && newName.trim() && newName !== data.name) {
                dispatchCommand({
                  command_type: 'RENAME_CLASS',
                  class_id: data.id,
                  new_name: newName.trim(),
                });
              }
            }}
            title="Rename class"
            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDeleteClass}
            title="Delete class"
            className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Attributes List */}
      <div className="px-3 py-2 space-y-1.5 text-xs text-slate-700">
        {data.attributes.length === 0 ? (
          <div className="text-slate-400 italic text-[11px] py-1 text-center">No attributes</div>
        ) : (
          data.attributes.map((attr) => (
            <div
              key={attr.id}
              className="group flex items-center justify-between py-0.5 hover:bg-slate-50 px-1 rounded transition"
            >
              <div className="flex items-center space-x-1.5 font-mono">
                {attr.primary_key ? (
                  <Key className="w-3 h-3 text-amber-500 flex-shrink-0" />
                ) : (
                  <span className="text-slate-400 text-xs w-3 text-center">
                    {attr.visibility === 'PUBLIC' ? '+' : '-'}
                  </span>
                )}
                <span className={attr.primary_key ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                  {attr.name}
                </span>
                <span className="text-slate-400 text-[11px]">: {attr.type}</span>
              </div>
              <button
                onClick={(e) => handleDeleteAttribute(e, attr.id)}
                title="Delete attribute"
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition p-0.5"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Quick Add Attribute */}
      <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/50 rounded-b-md">
        <button
          onClick={handleAddAttributeClick}
          className="w-full text-left text-[11px] text-sky-600 hover:text-sky-700 font-medium flex items-center space-x-1 hover:underline transition"
        >
          <Plus className="w-3 h-3" />
          <span>Add attribute</span>
        </button>
      </div>
    </div>
  );
});
