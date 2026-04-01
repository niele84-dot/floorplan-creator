import React from 'react';
import { Room } from '@/types/project';
import { Link } from 'lucide-react';

interface RoomOverlayProps {
  room: Room;
  isSelected: boolean;
  isLinkTarget: boolean;
  onSelect: () => void;
  onStartLink: () => void;
  showVertices?: boolean;
  onVertexDrag?: (vertexIndex: number, leftPct: number, topPct: number) => void;
}

export function RoomOverlay({
  room,
  isSelected,
  isLinkTarget,
  onSelect,
  onStartLink,
  showVertices,
  onVertexDrag,
}: RoomOverlayProps) {
  if (room.polygon.length < 3) return null;

  const points = room.polygon.map(p => `${p.leftPct}%,${p.topPct}%`).join(' ');

  // Calculate centroid for label
  const cx = room.polygon.reduce((s, p) => s + p.leftPct, 0) / room.polygon.length;
  const cy = room.polygon.reduce((s, p) => s + p.topPct, 0) / room.polygon.length;

  const handleVertexMouseDown = (e: React.MouseEvent, idx: number) => {
    if (!onVertexDrag) return;
    e.stopPropagation();
    const svg = (e.target as SVGElement).closest('svg');
    if (!svg) return;

    const move = (ev: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const leftPct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      const topPct = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));
      onVertexDrag(idx, leftPct, topPct);
    };

    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <>
      <polygon
        points={points}
        fill={room.overlayColor || '#FFA500'}
        fillOpacity={isSelected ? 0.35 : 0.2}
        stroke={isSelected ? 'hsl(var(--primary))' : isLinkTarget ? '#22d3ee' : room.overlayColor || '#FFA500'}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray={isLinkTarget ? '6 3' : undefined}
        className="cursor-pointer"
        style={{ pointerEvents: 'all' }}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      />
      {/* Room name label */}
      <foreignObject
        x={`${cx - 8}%`}
        y={`${cy - 2}%`}
        width="16%"
        height="4%"
        style={{ pointerEvents: 'none', overflow: 'visible' }}
      >
        <div className="flex items-center justify-center w-full h-full">
          <span className="text-[10px] font-semibold text-foreground bg-card/80 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
            {room.name || 'Stanza'}
          </span>
        </div>
      </foreignObject>
      {/* Link chain icon */}
      {isSelected && (
        <foreignObject
          x={`${cx + 5}%`}
          y={`${cy - 3}%`}
          width="24"
          height="24"
          style={{ pointerEvents: 'all', overflow: 'visible' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onStartLink(); }}
            className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors ${
              room.linkedElementId
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-accent'
            }`}
            title={room.linkedElementId ? 'Cambia icona collegata' : 'Collega a un\'icona'}
          >
            <Link className="h-3 w-3" />
          </button>
        </foreignObject>
      )}
      {/* Draggable vertices */}
      {showVertices && room.polygon.map((p, i) => (
        <circle
          key={i}
          cx={`${p.leftPct}%`}
          cy={`${p.topPct}%`}
          r="5"
          fill="hsl(var(--primary))"
          stroke="white"
          strokeWidth="2"
          className="cursor-move"
          style={{ pointerEvents: 'all' }}
          onMouseDown={(e) => handleVertexMouseDown(e, i)}
        />
      ))}
    </>
  );
}
