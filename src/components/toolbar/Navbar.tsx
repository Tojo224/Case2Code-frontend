import React, { useState } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { Code2, Download, Plus, AlertCircle, RefreshCw, FolderPlus, Bot } from 'lucide-react';
import { CollaboratorAvatars } from '../collaboration/CollaboratorAvatars';
import { UserMenu } from '../auth/UserMenu';
import { ThemeToggle } from './ThemeToggle';

export const Navbar: React.FC = () => {
  const {
    currentDocument,
    diagramsList,
    createDiagram,
    loadDiagram,
    dispatchCommand,
    generateBackend,
    isGenerating,
    error,
    clearError,
    isAssistantOpen,
    toggleAssistant,
  } = useDiagramStore();

  const [isCreatingDiag, setIsCreatingDiag] = useState(false);
  const [newDiagName, setNewDiagName] = useState('');

  const handleAddClass = () => {
    const className = prompt('Enter new class name (PascalCase):', 'NuevaClase');
    if (!className || !className.trim()) return;

    // Calculate a nice viewport position
    const randomOffset = Math.floor(Math.random() * 80);
    dispatchCommand({
      command_type: 'CREATE_CLASS',
      name: className.trim(),
      position: { x: 150 + randomOffset, y: 150 + randomOffset },
    });
  };

  const handleCreateDiagramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiagName.trim()) return;
    await createDiagram(newDiagName.trim());
    setNewDiagName('');
    setIsCreatingDiag(false);
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-30 relative transition-colors">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Brand & Project Info */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="bg-sky-600 dark:bg-sky-500 text-white p-1.5 rounded-lg shadow-sm shrink-0">
            <Code2 className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-base tracking-tight">Case2Code</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block -mt-1 font-medium">UML CASE Modeler</span>
          </div>

          <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 sm:mx-2" />

          {/* Diagram Selector */}
          <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
            <select
              value={currentDocument?.id || ''}
              onChange={(e) => loadDiagram(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[110px] sm:max-w-[180px] md:max-w-[220px] truncate"
            >
              {diagramsList.map((d) => (
                <option key={d.id} value={d.id} className="dark:bg-slate-800 dark:text-slate-100">
                  {d.name} (v{d.version})
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsCreatingDiag(true)}
              title="Create new diagram"
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          <button
            onClick={handleAddClass}
            title="Agregar Clase"
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-md shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Clase</span>
          </button>

          <button
            onClick={toggleAssistant}
            title="Asistente CASE IA"
            className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-md shadow-sm transition border ${
              isAssistantOpen
                ? 'bg-sky-600 text-white border-sky-500 hover:bg-sky-700'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            <Bot className={`w-3.5 h-3.5 shrink-0 ${isAssistantOpen ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`} />
            <span className="hidden lg:inline">Asistente CASE</span>
          </button>

          <button
            onClick={() => generateBackend(false)}
            disabled={isGenerating || !currentDocument || currentDocument.classes.length === 0}
            title="Generar Backend Spring Boot"
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-md shadow-sm transition"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Download className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="hidden sm:inline">{isGenerating ? 'Generando...' : 'Spring Boot'}</span>
          </button>

          <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Real-Time Collaborators Presence */}
          <CollaboratorAvatars />

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Dark / Light Theme Toggle (Sun / Moon) */}
          <ThemeToggle />

          {/* User Profile & Demo Switcher */}
          <UserMenu />
        </div>
      </div>

      {/* Error alert toast */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-900 px-4 py-2 flex items-center justify-between text-xs text-red-700 dark:text-red-300 animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={clearError} className="font-semibold text-red-800 dark:text-red-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Create Diagram Modal */}
      {isCreatingDiag && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateDiagramSubmit}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200 dark:border-slate-800"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Create New UML Diagram</h3>
            <input
              type="text"
              required
              autoFocus
              placeholder="Diagram name (e.g. Peluqueria)"
              value={newDiagName}
              onChange={(e) => setNewDiagName(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsCreatingDiag(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};
