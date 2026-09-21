import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { UmlRelationship } from '../../types/uml';
import { useDiagramStore } from '../../store/useDiagramStore';

export const UmlRelationshipEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}: EdgeProps & { data?: UmlRelationship }) => {
  const { dispatchCommand } = useDiagramStore();

  const isSelf = Boolean(data?.source_class_id && data?.target_class_id && data.source_class_id === data.target_class_id);

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isSelf) {
    // Beautiful self-loop bezier curve
    const loopOffset = 65;
    edgePath = `M ${sourceX} ${sourceY} C ${sourceX + loopOffset} ${sourceY - 25}, ${targetX + loopOffset} ${targetY + 45}, ${targetX} ${targetY}`;
    labelX = Math.max(sourceX, targetX) + loopOffset * 0.75;
    labelY = (sourceY + targetY) / 2 + 10;
  } else {
    const [path, lx, ly] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 8,
    });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this relationship?')) {
      dispatchCommand({
        command_type: 'DELETE_RELATIONSHIP',
        relationship_id: id,
      });
    }
  };

  const relType = data?.type || 'ONE_TO_MANY';

  // Determine line dash and color
  const isDashed = relType === 'REALIZATION' || relType === 'DEPENDENCY';
  const edgeStroke = '#475569';

  // SVG Marker IDs
  const markerStartId = relType === 'COMPOSITION'
    ? 'url(#marker-composition-diamond)'
    : relType === 'AGGREGATION'
    ? 'url(#marker-aggregation-diamond)'
    : undefined;

  const markerEndId = (relType === 'INHERITANCE' || relType === 'REALIZATION')
    ? 'url(#marker-inheritance-triangle)'
    : (relType === 'DEPENDENCY' || relType === 'ONE_TO_MANY' || relType === 'MANY_TO_ONE' || relType === 'MANY_TO_MANY')
    ? 'url(#marker-nav-arrow)'
    : undefined;

  const getRelationshipBadge = () => {
    let base = '';
    switch (relType) {
      case 'ONE_TO_MANY':
        base = data?.source_cardinality && data?.target_cardinality
          ? `${data.source_cardinality} : ${data.target_cardinality}`
          : '1 : N';
        break;
      case 'MANY_TO_ONE':
        base = data?.source_cardinality && data?.target_cardinality
          ? `${data.source_cardinality} : ${data.target_cardinality}`
          : 'N : 1';
        break;
      case 'ONE_TO_ONE':
        base = '1 : 1';
        break;
      case 'MANY_TO_MANY':
        base = 'N : M';
        break;
      case 'COMPOSITION':
        base = '◆ Composición';
        break;
      case 'AGGREGATION':
        base = '◇ Agregación';
        break;
      case 'INHERITANCE':
        base = '▷ extends';
        break;
      case 'REALIZATION':
        base = '··▷ implements';
        break;
      case 'DEPENDENCY':
        base = '··> uses';
        break;
      default:
        base = 'relates';
    }
    return isSelf ? `↺ ${base}` : base;
  };

  return (
    <>
      {/* SVG Marker Definitions */}
      <defs>
        {/* Composition: Filled black diamond at source */}
        <marker
          id="marker-composition-diamond"
          viewBox="0 0 20 20"
          refX="10"
          refY="10"
          markerWidth="16"
          markerHeight="16"
          orient="auto-start-reverse"
        >
          <polygon points="10,2 18,10 10,18 2,10" fill="#0f172a" stroke="#0f172a" strokeWidth="1.5" />
        </marker>

        {/* Aggregation: Hollow white diamond at source */}
        <marker
          id="marker-aggregation-diamond"
          viewBox="0 0 20 20"
          refX="10"
          refY="10"
          markerWidth="16"
          markerHeight="16"
          orient="auto-start-reverse"
        >
          <polygon points="10,2 18,10 10,18 2,10" fill="#ffffff" stroke="#334155" strokeWidth="2" />
        </marker>

        {/* Inheritance / Realization: Hollow white triangle at target */}
        <marker
          id="marker-inheritance-triangle"
          viewBox="0 0 20 20"
          refX="18"
          refY="10"
          markerWidth="14"
          markerHeight="14"
          orient="auto-start-reverse"
        >
          <polygon points="3,3 18,10 3,17" fill="#ffffff" stroke="#334155" strokeWidth="2" />
        </marker>

        {/* Navigable / Dependency Arrow */}
        <marker
          id="marker-nav-arrow"
          viewBox="0 0 20 20"
          refX="16"
          refY="10"
          markerWidth="12"
          markerHeight="12"
          orient="auto-start-reverse"
        >
          <path d="M 4,4 L 16,10 L 4,16" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      <BaseEdge
        path={edgePath}
        markerStart={markerStartId}
        markerEnd={markerEndId}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: edgeStroke,
          strokeDasharray: isDashed ? '6,6' : undefined,
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group flex items-center space-x-1.5 bg-white/95 px-2.5 py-1 rounded-full border border-slate-300 shadow-md text-[11px] font-mono font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700 transition"
        >
          <span>{getRelationshipBadge()}</span>
          {data?.target_role && (
            <span className="text-[10px] text-slate-400 font-normal italic">
              ({data.target_role})
            </span>
          )}
          <button
            onClick={handleDelete}
            title="Delete relationship"
            className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition text-slate-400 ml-0.5"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
