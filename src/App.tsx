import React, { useEffect } from 'react';
import { FolderPlus } from 'lucide-react';
import { useDiagramStore } from './store/useDiagramStore';
import { useAuthStore } from './store/useAuthStore';
import { useCollaborationStore } from './store/useCollaborationStore';
import { useThemeStore } from './store/useThemeStore';
import { Navbar } from './components/toolbar/Navbar';
import { RelationshipSidebar } from './components/toolbar/RelationshipSidebar';
import { DiagramCanvas } from './components/canvas/DiagramCanvas';
import { CaseAssistantChat } from './components/assistant/CaseAssistantChat';
import { InviteModal } from './components/collaboration/InviteModal';
import { AuthModal } from './components/auth/AuthModal';

export const App: React.FC = () => {
  const { fetchDiagrams, currentDocument, createDiagram, isLoading, resetDiagrams } = useDiagramStore();
  const { loadSession } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    // 0. Initialize theme (dark / light mode)
    initTheme();

    const init = async () => {
      // 1. Initialize user session (purges any legacy demo user)
      await loadSession();

      const user = useAuthStore.getState().currentUser;
      if (user) {
        // 2. Fetch accessible diagrams for active user
        await fetchDiagrams();
      } else {
        // Prompt login if no active user session
        resetDiagrams();
        useCollaborationStore.getState().setAuthModalOpen(true);
      }
    };

    init();
  }, [initTheme, loadSession, fetchDiagrams, resetDiagrams]);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />
      <main className="flex-1 relative flex overflow-hidden">
        {isLoading && !currentDocument ? (
          <div className="flex items-center justify-center h-full w-full text-slate-400 text-sm">
            Cargando proyecto...
          </div>
        ) : !currentDocument ? (
          <div className="flex flex-col items-center justify-center h-full w-full text-slate-500 dark:text-slate-400 p-8 text-center select-none">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-xs">
              <FolderPlus className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              No tienes ningún proyecto activo
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Crea tu primer proyecto para comenzar a diseñar tus diagramas UML en tu espacio privado.
            </p>
            <button
              onClick={() => createDiagram('Mi Primer Diagrama', 'Proyecto personal')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              + Crear mi primer proyecto
            </button>
          </div>
        ) : (
          <>
            <RelationshipSidebar />
            <div className="flex-1 h-full relative overflow-hidden">
              <DiagramCanvas />
              <CaseAssistantChat />
            </div>
          </>
        )}
      </main>

      {/* Global Collaboration & Auth Modals */}
      <InviteModal />
      <AuthModal />
    </div>
  );
};

export default App;
