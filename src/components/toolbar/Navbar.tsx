import React, { useState, useRef } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import {
  Code2,
  Database,
  Download,
  Smartphone,
  Plus,
  AlertCircle,
  RefreshCw,
  FolderPlus,
  Bot,
  FileDown,
  FileUp,
  HelpCircle,
  History,
  FileText,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useUndoStore } from '../../store/useUndoStore';
import { CollaboratorAvatars } from '../collaboration/CollaboratorAvatars';
import { UserMenu } from '../auth/UserMenu';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../../store/useAuthStore';
import { useTourStore } from '../../store/useTourStore';
import { useVersionStore } from '../../store/useVersionStore';

export const Navbar: React.FC = () => {
  const canUndo = useUndoStore((s) => {
    const id = useDiagramStore.getState().currentDocument?.id;
    return !!id && (s.stacks[id]?.undoStack.length ?? 0) > 0;
  });
  const canRedo = useUndoStore((s) => {
    const id = useDiagramStore.getState().currentDocument?.id;
    return !!id && (s.stacks[id]?.redoStack.length ?? 0) > 0;
  });
  const undoAction = useUndoStore((s) => s.undo);
  const redoAction = useUndoStore((s) => s.redo);
  const {
    currentDocument,
    diagramsList,
    createDiagram,
    loadDiagram,
    generateBackend,
    generateMobileApp,
    isGenerating,
    isGeneratingMobile,
    error,
    clearError,
    isAssistantOpen,
    toggleAssistant,
    openCreateClassModal,
    openSqlModal,
    exportXmi,
    importXmi,
    importNewDiagramXmi,
    isExportingXmi,
    isImportingXmi,
    exportDocs,
    isExportingDocs,
  } = useDiagramStore();

  const currentUser = useAuthStore((s) => s.currentUser);
  const restartTour = useTourStore((s) => s.restart);
  const openVersionPanel = useVersionStore((s) => s.openPanel);

  const [isCreatingDiag, setIsCreatingDiag] = useState(false);
  const [newDiagName, setNewDiagName] = useState('');
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const newDiagFileInputRef = useRef<HTMLInputElement>(null);

  const handleAddClass = () => {
    openCreateClassModal();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importXmi(file);
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
    }
  };

  const handleCreateDiagramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiagName.trim() && !selectedImportFile) return;

    if (selectedImportFile) {
      await importNewDiagramXmi(selectedImportFile, newDiagName.trim() || undefined);
    } else {
      await createDiagram(newDiagName.trim());
    }

    setNewDiagName('');
    setSelectedImportFile(null);
    setIsCreatingDiag(false);
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-30 relative transition-colors">
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 h-14">
        {/* Brand & Project Info */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <div className="bg-sky-600 dark:bg-sky-500 text-white p-1.5 rounded-lg shadow-sm shrink-0">
            <Code2 className="w-5 h-5" />
          </div>
          <div className="hidden md:block shrink-0 whitespace-nowrap leading-tight">
            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-base tracking-tight block">Case2Code</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block -mt-0.5 font-medium">UML CASE Modeler</span>
          </div>

          <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

          {/* Diagram Selector */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
            <select
              data-tour="navbar-project-select"
              value={currentDocument?.id || ''}
              onChange={(e) => loadDiagram(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition focus:outline-none focus:ring-1 focus:ring-sky-500 w-28 sm:w-36 lg:w-44 2xl:w-56 truncate"
            >
              {diagramsList.map((d) => (
                <option key={d.id} value={d.id} className="dark:bg-slate-800 dark:text-slate-100">
                  {d.name} (v{d.version})
                </option>
              ))}
            </select>

            <button
              data-tour="navbar-new-diagram"
              onClick={() => setIsCreatingDiag(true)}
              title="Create new diagram"
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 2xl:gap-2 min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 2xl:gap-2 min-w-0 overflow-x-auto c2c-toolbar-scroll py-1">
            <button
              data-tour="navbar-add-class"
              onClick={handleAddClass}
              title="Agregar Clase"
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm transition shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Clase</span>
            </button>

            <button
              onClick={() => void undoAction()}
              disabled={!canUndo}
              title="Deshacer (Ctrl+Z)"
              aria-label="Deshacer"
              className="p-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => void redoAction()}
              disabled={!canRedo}
              title="Rehacer (Ctrl+Shift+Z)"
              aria-label="Rehacer"
              className="p-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <button
              data-tour="navbar-ai"
              onClick={toggleAssistant}
              title="Senior AI Colleague & Chat de Equipo"
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm transition border shrink-0 whitespace-nowrap ${
                isAssistantOpen
                  ? 'bg-purple-600 text-white border-purple-500 hover:bg-purple-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <Bot className={`w-3.5 h-3.5 shrink-0 ${isAssistantOpen ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
              <span className="hidden md:inline">Senior AI</span>
            </button>

            <button
              data-tour="navbar-sql"
              onClick={openSqlModal}
              disabled={!currentDocument || currentDocument.classes.length === 0}
              title="Generar y Exportar Script SQL (PostgreSQL, MySQL, SQLite, SQL Server)"
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">SQL</span>
            </button>

            <button
              onClick={exportDocs}
              disabled={isExportingDocs || !currentDocument || currentDocument.classes.length === 0}
              title="Descargar diccionario de datos y reglas de negocio (PDF)"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              {isExportingDocs ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="hidden xl:inline">Docs</span>
            </button>

            <button
              data-tour="navbar-history"
              onClick={openVersionPanel}
              disabled={!currentDocument}
              aria-label="Historial de versiones"
              title="Historial de versiones"
              className="flex items-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Historial</span>
            </button>

            <button
              data-tour="navbar-springboot"
              onClick={() => generateBackend(false)}
              disabled={isGenerating || !currentDocument || currentDocument.classes.length === 0}
              title="Generar Backend Spring Boot"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              {isGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Download className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="hidden lg:inline">{isGenerating ? 'Generando...' : 'Spring Boot'}</span>
            </button>

            <button
              data-tour="navbar-flutter"
              onClick={generateMobileApp}
              disabled={isGeneratingMobile || !currentDocument || currentDocument.classes.length === 0}
              title="Generar App Móvil Genérica (Flutter Material 3)"
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              {isGeneratingMobile ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="hidden xl:inline">{isGeneratingMobile ? 'Generando...' : 'Flutter App'}</span>
            </button>

            {/* Enterprise Architect XMI Interchange Controls */}
            <div
              data-tour="navbar-xmi"
              className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-md p-0.5 bg-slate-50 dark:bg-slate-800/80 shrink-0"
            >
              <button
                onClick={exportXmi}
                disabled={isExportingXmi || !currentDocument || currentDocument.classes.length === 0}
                title="Exportar a Enterprise Architect (XMI 2.1)"
                className="flex items-center gap-1 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-white dark:hover:bg-slate-700 px-2 py-1 rounded text-xs font-medium transition disabled:opacity-40 shrink-0 whitespace-nowrap"
              >
                {isExportingXmi ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600 shrink-0" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                )}
                <span className="hidden 2xl:inline">Exportar EA</span>
              </button>

              <button
                onClick={() => importFileInputRef.current?.click()}
                disabled={isImportingXmi || !currentDocument}
                title="Importar modelo desde Enterprise Architect (XMI 2.1)"
                className="flex items-center gap-1 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-white dark:hover:bg-slate-700 px-2 py-1 rounded text-xs font-medium transition disabled:opacity-40 shrink-0 whitespace-nowrap"
              >
                {isImportingXmi ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                ) : (
                  <FileUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
                <span className="hidden 2xl:inline">Importar EA</span>
              </button>

              <input
                ref={importFileInputRef}
                type="file"
                accept=".xmi,.xml"
                className="hidden"
                onChange={handleImportFileChange}
              />
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

          {/* Real-Time Collaborators Presence */}
          <div className="shrink-0">
            <CollaboratorAvatars />
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

          {/* Dark / Light Theme Toggle (Sun / Moon) */}
          <div className="shrink-0">
            <ThemeToggle />
          </div>

          {/* Help: replay the guided tour */}
          {currentUser && (
            <button
              type="button"
              data-tour="help-button"
              onClick={restartTour}
              title="Ayuda: ver tutorial"
              aria-label="Ayuda: ver tutorial"
              className="p-2 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-sky-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs flex items-center justify-center cursor-pointer shrink-0"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}

          {/* User Profile & Demo Switcher */}
          <div className="shrink-0">
            <UserMenu />
          </div>
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
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Crear o Importar Diagrama</h3>
            
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Nombre del Diagrama
              </label>
              <input
                type="text"
                required={!selectedImportFile}
                autoFocus
                placeholder="Ej. Veterinaria"
                value={newDiagName}
                onChange={(e) => setNewDiagName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                O importar archivo Enterprise Architect (.xmi / .xml)
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => newDiagFileInputRef.current?.click()}
                  className="px-2.5 py-1.5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center space-x-1.5 w-full justify-center transition"
                >
                  <FileUp className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="truncate max-w-[200px]">
                    {selectedImportFile ? selectedImportFile.name : 'Seleccionar archivo XMI...'}
                  </span>
                </button>
                {selectedImportFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImportFile(null);
                      if (newDiagFileInputRef.current) newDiagFileInputRef.current.value = '';
                    }}
                    className="text-xs text-red-500 hover:underline shrink-0"
                  >
                    Quitar
                  </button>
                )}
                <input
                  ref={newDiagFileInputRef}
                  type="file"
                  accept=".xmi,.xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedImportFile(f);
                      if (!newDiagName) {
                        setNewDiagName(f.name.replace(/\.[^/.]+$/, ''));
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingDiag(false);
                  setSelectedImportFile(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isImportingXmi}
                className="flex items-center space-x-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isImportingXmi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <span>{selectedImportFile ? 'Importar y Crear' : 'Crear'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};
