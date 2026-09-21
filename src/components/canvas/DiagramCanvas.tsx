import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
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
  } = useDiagramStore();
  const isDark = useThemeStore((s) => s.isDark);

  const nodeTypes = useMemo(() => ({ umlClass: UmlClassNode }), []);
  const edgeTypes = useMemo(() => ({ umlRelationship: UmlRelationshipEdge }), []);

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] relative bg-slate-50 dark:bg-slate-950 transition-colors">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color={isDark ? '#334155' : '#cbd5e1'}
        />
        <Controls className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !shadow-md !rounded-lg dark:[&>button]:!bg-slate-800 dark:[&>button]:!border-slate-700 dark:[&>button]:!fill-slate-200" />
        <MiniMap
          nodeColor="#38bdf8"
          maskColor={isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(241, 245, 249, 0.7)'}
          className="!bg-white dark:!bg-slate-900 !border !border-slate-200 dark:!border-slate-800 !rounded-lg !shadow-md"
        />
        <LiveCursors />
      </ReactFlow>

      {/* Relationship Creation Modal */}
      <RelationshipModal />
    </div>
  );
};

