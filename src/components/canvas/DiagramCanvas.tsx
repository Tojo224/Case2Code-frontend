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
import { UmlClassNode } from './UmlClassNode';
import { UmlRelationshipEdge } from './UmlRelationshipEdge';
import { RelationshipModal } from '../modals/RelationshipModal';

export const DiagramCanvas: React.FC = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeDragStop,
    onConnect,
  } = useDiagramStore();

  const nodeTypes = useMemo(() => ({ umlClass: UmlClassNode }), []);
  const edgeTypes = useMemo(() => ({ umlRelationship: UmlRelationshipEdge }), []);

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] relative bg-slate-50">
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
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
        <Controls className="!bg-white !border-slate-200 !shadow-md !rounded-lg" />
        <MiniMap
          nodeColor="#38bdf8"
          maskColor="rgba(241, 245, 249, 0.7)"
          className="!bg-white !border !border-slate-200 !rounded-lg !shadow-md"
        />
      </ReactFlow>

      {/* Relationship Creation Modal */}
      <RelationshipModal />
    </div>
  );
};
