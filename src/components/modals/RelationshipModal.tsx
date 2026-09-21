import React, { useState } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { RelationshipType } from '../../types/uml';
import { GitCommit, X, Info } from 'lucide-react';

interface RelationshipOption {
  id: RelationshipType;
  label: string;
  category: 'association' | 'structural' | 'hierarchy';
  symbol: string;
  description: string;
  defaultSourceCard: string;
  defaultTargetCard: string;
}

const RELATIONSHIP_OPTIONS: RelationshipOption[] = [
  // Associations
  {
    id: 'ONE_TO_MANY',
    label: '1 : N (One to Many)',
    category: 'association',
    symbol: '1 ──────► *',
    description: 'A parent entity owns a list or collection of children (e.g., Department has Employees).',
    defaultSourceCard: '1',
    defaultTargetCard: '*',
  },
  {
    id: 'MANY_TO_ONE',
    label: 'N : 1 (Many to One)',
    category: 'association',
    symbol: '* ──────► 1',
    description: 'Multiple entities reference a single parent (e.g., Employee belongs to Department).',
    defaultSourceCard: '*',
    defaultTargetCard: '1',
  },
  {
    id: 'ONE_TO_ONE',
    label: '1 : 1 (One to One)',
    category: 'association',
    symbol: '1 ──────► 1',
    description: 'Each entity is associated with exactly one other entity (e.g., User has Profile).',
    defaultSourceCard: '1',
    defaultTargetCard: '1',
  },
  {
    id: 'MANY_TO_MANY',
    label: 'N : M (Many to Many)',
    category: 'association',
    symbol: '* ◄────► *',
    description: 'Shared cross-collection linked via a join table (e.g., Student participates in Courses).',
    defaultSourceCard: '*',
    defaultTargetCard: '*',
  },
  // Structural (Whole-Part)
  {
    id: 'COMPOSITION',
    label: 'Composition (◆)',
    category: 'structural',
    symbol: '◆──────►',
    description: 'Strict whole-part lifecycle (owns-a). If parent is deleted, parts are automatically deleted in cascade.',
    defaultSourceCard: '1',
    defaultTargetCard: '*',
  },
  {
    id: 'AGGREGATION',
    label: 'Aggregation (◇)',
    category: 'structural',
    symbol: '◇──────►',
    description: 'Shared whole-part relationship (has-a). The part entities can exist independently without the container.',
    defaultSourceCard: '1',
    defaultTargetCard: '*',
  },
  // Hierarchy & Usage
  {
    id: 'INHERITANCE',
    label: 'Inheritance (▷ extends)',
    category: 'hierarchy',
    symbol: '───────▷',
    description: 'Subclass inherits fields and behavior from Superclass (e.g., Manager extends Employee).',
    defaultSourceCard: '',
    defaultTargetCard: '',
  },
  {
    id: 'REALIZATION',
    label: 'Realization (··▷ implements)',
    category: 'hierarchy',
    symbol: '· · · · ▷',
    description: 'Class implements the contract of an Interface or abstract specification.',
    defaultSourceCard: '',
    defaultTargetCard: '',
  },
  {
    id: 'DEPENDENCY',
    label: 'Dependency (··> uses)',
    category: 'hierarchy',
    symbol: '· · · · >',
    description: 'Temporary usage or collaborator reference (e.g., Service injected into Controller).',
    defaultSourceCard: '',
    defaultTargetCard: '',
  },
];

export const RelationshipModal: React.FC = () => {
  const { pendingConnection, setPendingConnection, currentDocument, dispatchCommand } = useDiagramStore();
  const [selectedType, setSelectedType] = useState<RelationshipType>('ONE_TO_MANY');
  const [sourceCard, setSourceCard] = useState<string>('1');
  const [targetCard, setTargetCard] = useState<string>('*');
  const [sourceRole, setSourceRole] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'association' | 'structural' | 'hierarchy'>('association');

  if (!pendingConnection || !currentDocument) return null;

  const sourceClass = currentDocument.classes.find((c) => c.id === pendingConnection.source);
  const targetClass = currentDocument.classes.find((c) => c.id === pendingConnection.target);

  if (!sourceClass || !targetClass) return null;

  const currentOption = RELATIONSHIP_OPTIONS.find((o) => o.id === selectedType) || RELATIONSHIP_OPTIONS[0];
  const isMultiplicityApplicable = selectedType !== 'INHERITANCE' && selectedType !== 'REALIZATION' && selectedType !== 'DEPENDENCY';

  const handleSelectType = (option: RelationshipOption) => {
    setSelectedType(option.id);
    setSourceCard(option.defaultSourceCard);
    setTargetCard(option.defaultTargetCard);
  };

  const handleCreate = async () => {
    try {
      await dispatchCommand({
        command_type: 'CREATE_RELATIONSHIP',
        source_class_id: sourceClass.id,
        target_class_id: targetClass.id,
        source_handle: pendingConnection.sourceHandle || undefined,
        target_handle: pendingConnection.targetHandle || undefined,
        type: selectedType,
        source_cardinality: isMultiplicityApplicable ? sourceCard || '1' : '',
        target_cardinality: isMultiplicityApplicable ? targetCard || '1' : '',
        source_role: sourceRole.trim() || undefined,
        target_role: targetRole.trim() || undefined,
      });
      setPendingConnection(null);
    } catch {
      // Error handled by diagram store
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
          <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-100 font-semibold">
            <div className="p-1.5 bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 rounded-lg">
              <GitCommit className="w-5 h-5" />
            </div>
            <span>Create UML Relationship</span>
          </div>
          <button
            onClick={() => setPendingConnection(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Dynamic Visual Diagram Preview */}
          <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-xl p-4 shadow-inner border border-slate-800">
            <div className="flex items-center justify-between font-mono text-sm">
              <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-sky-300 font-bold">
                {sourceClass.name}
              </div>
              <div className="flex flex-col items-center px-3">
                <span className="text-amber-400 font-bold tracking-widest text-base">
                  {currentOption.symbol}
                </span>
                {isMultiplicityApplicable && (
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    {sourceCard || '1'} : {targetCard || '*'}
                  </span>
                )}
              </div>
              <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-emerald-300 font-bold">
                {targetClass.name}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400 border-t border-slate-800/80 pt-2 flex items-start space-x-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>{currentOption.description}</span>
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('association')}
              className={`flex-1 py-1.5 rounded-md transition ${
                activeTab === 'association'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Associations
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('structural')}
              className={`flex-1 py-1.5 rounded-md transition ${
                activeTab === 'structural'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Structural (◇/◆)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hierarchy')}
              className={`flex-1 py-1.5 rounded-md transition ${
                activeTab === 'hierarchy'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Hierarchy (▷/··▷)
            </button>
          </div>

          {/* Relationship Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {RELATIONSHIP_OPTIONS.filter((o) => o.category === activeTab).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectType(item)}
                className={`p-3 rounded-xl border text-left font-medium transition flex flex-col justify-between ${
                  selectedType === item.id
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-2 ring-sky-200 dark:ring-sky-800'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{item.label}</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{item.symbol}</div>
              </button>
            ))}
          </div>

          {/* Multiplicity Configuration (If Applicable) */}
          {isMultiplicityApplicable && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Source Multiplicity ({sourceClass.name})
                </label>
                <select
                  value={sourceCard}
                  onChange={(e) => setSourceCard(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="1">1 (One)</option>
                  <option value="*">* (Many)</option>
                  <option value="0..1">0..1 (Zero or One)</option>
                  <option value="1..*">1..* (One or More)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Target Multiplicity ({targetClass.name})
                </label>
                <select
                  value={targetCard}
                  onChange={(e) => setTargetCard(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="*">* (Many)</option>
                  <option value="1">1 (One)</option>
                  <option value="0..1">0..1 (Zero or One)</option>
                  <option value="1..*">1..* (One or More)</option>
                </select>
              </div>
            </div>
          )}

          {/* Optional Role Names */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Source Role (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. author"
                value={sourceRole}
                onChange={(e) => setSourceRole(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Target Role (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. books"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setPendingConnection(null)}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition"
          >
            Create Relationship
          </button>
        </div>
      </div>
    </div>
  );
};
