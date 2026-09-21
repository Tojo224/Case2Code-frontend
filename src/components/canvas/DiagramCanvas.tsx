import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDiagramStore } from '../../store/useDiagramStore';
import { useThemeStore } from '../../store/useThemeStore';
import { UmlClassNode } from './UmlClassNode';
import { UmlRelationshipEdge } from './UmlRelationshipEdge';
import { RelationshipModal } from '../modals/RelationshipModal';
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
  } = useDiagramStore();
  const isDark = useThemeStore((s) => s.isDark);

  const nodeTypes = useMemo(() => ({ umlClass: UmlClassNode }), []);
  const edgeTypes = useMemo(() => ({ umlRelationship: UmlRelationshipEdge }), []);

  return (
    <div className={`w-full h-full relative bg-slate-50 dark:bg-slate-950 transition-colors ${activeRelationType ? 'cursor-crosshair' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
    </div>
  );
};

