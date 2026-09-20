import React, { useEffect } from 'react';
import { useDiagramStore } from './store/useDiagramStore';
import { Navbar } from './components/toolbar/Navbar';
import { DiagramCanvas } from './components/canvas/DiagramCanvas';

export const App: React.FC = () => {
  const { fetchDiagrams, currentDocument, createDiagram, isLoading } = useDiagramStore();

  useEffect(() => {
    fetchDiagrams().then(() => {
      // If no diagrams exist, create default "Peluqueria"
      if (!currentDocument && useDiagramStore.getState().diagramsList.length === 0) {
        createDiagram('Peluqueria', 'Diagrama de clases para examen');
      }
    });
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-slate-100">
      <Navbar />
      <main className="flex-1 relative">
        {isLoading && !currentDocument ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Loading diagram...
          </div>
        ) : (
          <DiagramCanvas />
        )}
      </main>
    </div>
  );
};

export default App;
