import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Room } from '@/types/project';
import { Eye, Layers, Home, Box, ImageIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LayerPanelProps {
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  isBackgroundSelected: boolean;
  setBackgroundSelected: (v: boolean) => void;
}

export function LayerPanel({ selectedRoomId, setSelectedRoomId, isBackgroundSelected, setBackgroundSelected }: LayerPanelProps) {
  const { project, selectedElementId, setSelectedElementId } = useProject();
  const rooms = project.rooms || [];
  const elements = [...project.elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {/* Background layer */}
        <div className="px-2 pt-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Sfondo</span>
          <div className="mt-1 space-y-0.5">
            <button
              onClick={() => {
                setBackgroundSelected(true);
                setSelectedElementId(null);
                setSelectedRoomId(null);
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                isBackgroundSelected
                  ? 'bg-primary/15 text-primary'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">
                {project.backgroundImage ? project.backgroundImage.filename : 'Nessuno sfondo'}
              </span>
            </button>
          </div>
        </div>

        {rooms.length > 0 && (
          <div className="px-2 pt-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Stanze</span>
            <div className="mt-1 space-y-0.5">
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setSelectedElementId(null);
                    setBackgroundSelected(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                    selectedRoomId === room.id
                      ? 'bg-primary/15 text-primary'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0 border border-border"
                    style={{ backgroundColor: room.overlayColor || '#FFA500' }}
                  />
                  <span className="truncate">{room.name || 'Stanza'}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {elements.length > 0 && (
          <div className="px-2 pt-2 pb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Elementi</span>
            <div className="mt-1 space-y-0.5">
              {elements.map(el => (
                <button
                  key={el.id}
                  onClick={() => {
                    setSelectedElementId(el.id);
                    setSelectedRoomId(null);
                    setBackgroundSelected(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                    selectedElementId === el.id
                      ? 'bg-primary/15 text-primary'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  {el.ha.icon ? (
                    <img
                      src={`https://api.iconify.design/${el.iconSetId || 'mdi'}/${el.iconName || el.ha.icon.replace('mdi:', '')}.svg?color=%2394a3b8`}
                      alt=""
                      className="w-3.5 h-3.5 flex-shrink-0"
                    />
                  ) : (
                    <Box className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{el.label || el.ha.entity || el.ha.icon || el.type}</span>
                  <span className="ml-auto text-[9px] text-muted-foreground font-mono">z{el.zIndex}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {rooms.length === 0 && elements.length === 0 && !project.backgroundImage && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Nessun elemento
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
