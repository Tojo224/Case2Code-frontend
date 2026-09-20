import React, { useEffect } from 'react';
import { useDiagramStore } from './store/useDiagramStore';
import { useAuthStore } from './store/useAuthStore';
import { Navbar } from './components/toolbar/Navbar';
import { DiagramCanvas } from './components/canvas/DiagramCanvas';
import { CaseAssistantChat } from './components/assistant/CaseAssistantChat';
import { InviteModal } from './components/collaboration/InviteModal';
import { AuthModal } from './components/auth/AuthModal';

export const App: React.FC = () => {
  const { fetchDiagrams, currentDocument, createDiagram, isLoading } = useDiagramStore();
  const { loadSession } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      // 1. Initialize user session and seed demo users
      await loadSession();

      // 2. Fetch accessible diagrams for active user
      await fetchDiagrams();

      // 3. If no diagrams exist, create a starter diagram
      if (!useDiagramStore.getState().currentDocument && useDiagramStore.getState().diagramsList.length === 0) {
        await createDiagram('Peluqueria', 'Diagrama de clases para examen');
      }
    };

    init();
  }, [loadSession, fetchDiagrams, createDiagram]);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-slate-100">
      <Navbar />
      <main className="flex-1 relative">
        {isLoading && !currentDocument ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Loading diagram...
          </div>
        ) : (
          <>
            <DiagramCanvas />
            <CaseAssistantChat />
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
