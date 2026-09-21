import React, { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCollaborationStore } from '../../store/useCollaborationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { collaborationWs } from '../../services/websocket';

export const LiveCursors: React.FC = () => {
  const { flowToScreenPosition, screenToFlowPosition } = useReactFlow();
  const remoteCursors = useCollaborationStore((s) => s.remoteCursors);
  const currentUser = useAuthStore((s) => s.currentUser);

  // Send local cursor position on pointer move
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const container = document.querySelector('.react-flow');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        collaborationWs.sendCursor(flowPos.x, flowPos.y);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [screenToFlowPosition]);

  const cursorsList = Object.values(remoteCursors).filter(
    (c) => c.userId !== currentUser?.id && Date.now() - c.lastSeen < 15000
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {cursorsList.map((cursor) => {
        const screenPos = flowToScreenPosition({ x: cursor.x, y: cursor.y });
        return (
          <div
            key={cursor.userId}
            style={{
              transform: `translate(${screenPos.x}px, ${screenPos.y}px)`,
              transition: 'transform 80ms ease-out',
            }}
            className="absolute left-0 top-0 will-change-transform flex items-start select-none"
          >
            {/* SVG Cursor Pointer */}
            <svg
              className="w-5 h-5 -rotate-12 drop-shadow-md"
              viewBox="0 0 24 24"
              fill={cursor.avatarColor || '#3B82F6'}
              stroke="#ffffff"
              strokeWidth="1.5"
            >
              <path d="M5.653 3.123A1.2 1.2 0 0 0 4 4.22v15.56a1.2 1.2 0 0 0 1.98.91l4.57-3.84a1.2 1.2 0 0 1 .77-.28h7.46a1.2 1.2 0 0 0 .91-1.98L6.853 3.42a1.2 1.2 0 0 0-1.2-.297z" />
            </svg>

            {/* Name Badge */}
            <div
              style={{ backgroundColor: cursor.avatarColor || '#3B82F6' }}
              className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-md whitespace-nowrap tracking-tight flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
              {cursor.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

