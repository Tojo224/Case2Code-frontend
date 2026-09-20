import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
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
  markerEnd,
  data,
}: EdgeProps & { data?: UmlRelationship }) => {
  const { dispatchCommand } = useDiagramStore();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this relationship?')) {
      dispatchCommand({
        command_type: 'DELETE_RELATIONSHIP',
        relationship_id: id,
      });
    }
  };

  const getRelationshipBadge = (type?: string) => {
    switch (type) {
      case 'ONE_TO_MANY':
        return '1 : N';
      case 'MANY_TO_ONE':
        return 'N : 1';
      case 'ONE_TO_ONE':
        return '1 : 1';
      case 'MANY_TO_MANY':
        return 'N : M';
      case 'INHERITANCE':
        return 'extends';
      default:
        return 'relates';
    }
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2, stroke: '#64748b' }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group flex items-center space-x-1 bg-white px-2 py-0.5 rounded-full border border-slate-300 shadow-sm text-[11px] font-mono font-medium text-slate-700"
        >
          <span>{getRelationshipBadge(data?.type)}</span>
          <button
            onClick={handleDelete}
            title="Delete relationship"
            className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition text-slate-400 ml-1"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

