import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  ConnectionMode,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDiagramStore } from '../../store/useDiagramStore';
import { useThemeStore } from '../../store/useThemeStore';
import { UmlClassNode } from './UmlClassNode';
import { UmlRelationshipEdge } from './UmlRelationshipEdge';
import { RelationshipModal } from '../modals/RelationshipModal';
import { CreateClassModal } from '../modals/CreateClassModal';
import { SqlPreviewModal } from '../modals/SqlPreviewModal';
import { VersionHistoryPanel } from '../versions/VersionHistoryPanel';
import { LiveCursors } from '../collaboration/LiveCursors';

export const DiagramCanvas: React.FC = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeDragStop,
    onConnect,
    activeRelationType,
    setActiveRelationType,
    openCreateClassModal,
    hologramCommands,
    isApplyingHologram,
    applyHologram,
    clearHologram,
  } = useDiagramStore();
  const isDark = useThemeStore((s) => s.isDark);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const nodeTypes = useMemo(() => ({ umlClass: UmlClassNode }), []);
  const edgeTypes = useMemo(() => ({ umlRelationship: UmlRelationshipEdge }), []);

  const handleCanvasDoubleClick = (event: React.MouseEvent) => {
    // Do not trigger if in active relationship connecting mode
    if (activeRelationType) return;

    const target = event.target as HTMLElement;
    // Check if clicked on empty canvas pane or background
    if (
      target.classList.contains('react-flow__pane') ||
      target.closest('.react-flow__pane')
    ) {
      if (rfInstance) {
        const position = rfInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        openCreateClassModal(position);
      } else {
        openCreateClassModal();
      }
    }
  };

  return (
    <div data-tour="canvas" className={`w-full h-full relative bg-slate-50 dark:bg-slate-950 transition-colors ${activeRelationType ? 'cursor-crosshair' : ''}`}>
      <ReactFlow
        onInit={setRfInstance}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        zoomOnDoubleClick={false}
        onDoubleClick={handleCanvasDoubleClick}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.5}
          color={isDark ? '#475569' : '#0f172a'}
        />
        <Controls className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !shadow-md !rounded-lg dark:[&>button]:!bg-slate-800 dark:[&>button]:!border-slate-700 dark:[&>button]:!fill-slate-200" />
        <MiniMap
          nodeColor="#38bdf8"
          maskColor={isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(241, 245, 249, 0.7)'}
          className="!bg-white dark:!bg-slate-900 !border !border-slate-200 dark:!border-slate-800 !rounded-lg !shadow-md"
        />
        <LiveCursors />
      </ReactFlow>

      {/* Floating Hologram Preview Control Bar */}
      {hologramCommands && hologramCommands.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-cyan-950/90 text-cyan-100 rounded-full shadow-[0_0_24px_rgba(34,211,238,0.35)] backdrop-blur-md text-xs font-medium border border-cyan-400/50 animate-in fade-in">
          <span>
            👻 <strong>Holograma Activo</strong> ({hologramCommands.length} sugerencias sin aplicar)
          </span>
          <button
            onClick={() => applyHologram()}
            disabled={isApplyingHologram}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-full transition cursor-pointer shadow-xs"
          >
            {isApplyingHologram ? 'Aplicando...' : '✓ Aplicar al Diagrama'}
          </button>
          <button
            onClick={() => clearHologram()}
            disabled={isApplyingHologram}
            className="px-2.5 py-1 bg-slate-800 hover:bg-red-900/70 text-slate-300 hover:text-white rounded-full transition cursor-pointer"
            title="Descartar Holograma"
          >
            ✕ Descartar
          </button>
        </div>
      )}

      {/* Floating Mode Indicator */}
      {activeRelationType && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-4 py-2 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-full shadow-lg backdrop-blur-xs text-xs font-medium border border-indigo-400/40 animate-fade-in">
          <span>Modo <strong>{activeRelationType}</strong>: arrastrá entre dos clases (o a sí misma) para conectar</span>
          <button
            onClick={() => setActiveRelationType(null)}
            className="p-0.5 hover:bg-white/20 rounded-full transition"
            title="Cancelar (Esc)"
          >
            ✕
          </button>
        </div>
      )}

      {/* Relationship Creation Modal */}
      <RelationshipModal />

      {/* Class Creation Modal */}
      <CreateClassModal />

      {/* SQL Code Preview & Multi-Dialect Exporter Modal */}
      <SqlPreviewModal />

      {/* Version history drawer */}
      <VersionHistoryPanel />
    </div>
  );
};

