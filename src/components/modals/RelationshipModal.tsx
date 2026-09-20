import React, { useState } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { RelationshipType } from '../../types/uml';
import { GitCommit, X } from 'lucide-react';

export const RelationshipModal: React.FC = () => {
  const { pendingConnection, setPendingConnection, currentDocument, dispatchCommand } = useDiagramStore();
  const [type, setType] = useState<RelationshipType>('ONE_TO_MANY');

  if (!pendingConnection || !currentDocument) return null;

  const sourceClass = currentDocument.classes.find((c) => c.id === pendingConnection.source);
  const targetClass = currentDocument.classes.find((c) => c.id === pendingConnection.target);

  if (!sourceClass || !targetClass) return null;

  const handleCreate = async () => {
    try {
      await dispatchCommand({
        command_type: 'CREATE_RELATIONSHIP',
        source_class_id: sourceClass.id,
        target_class_id: targetClass.id,
        type,
        source_cardinality: type === 'ONE_TO_MANY' || type === 'ONE_TO_ONE' ? '1' : '*',
        target_cardinality: type === 'ONE_TO_MANY' || type === 'MANY_TO_MANY' ? '*' : '1',
      });
      setPendingConnection(null);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold">
            <GitCommit className="w-5 h-5 text-sky-600" />
            <span>Create UML Relationship</span>
          </div>
          <button
            onClick={() => setPendingConnection(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-sm bg-slate-100 p-3 rounded-lg font-mono">
            <span className="font-bold text-sky-700">{sourceClass.name}</span>
            <span className="text-slate-400">───────►</span>
            <span className="font-bold text-emerald-700">{targetClass.name}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Relationship Type
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'ONE_TO_MANY', label: '1 : N (One to Many)' },
                { id: 'MANY_TO_ONE', label: 'N : 1 (Many to One)' },
                { id: 'ONE_TO_ONE', label: '1 : 1 (One to One)' },
                { id: 'MANY_TO_MANY', label: 'N : M (Many to Many)' },
                { id: 'INHERITANCE', label: 'Inheritance (Extends)' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id as RelationshipType)}
                  className={`p-2.5 rounded-lg border text-left font-medium transition ${
                    type === item.id
                      ? 'border-sky-500 bg-sky-50 text-sky-800 ring-2 ring-sky-200'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setPendingConnection(null)}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition"
          >
            Create Relationship
          </button>
        </div>
      </div>
    </div>
  );
};

