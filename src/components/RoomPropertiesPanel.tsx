import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Room } from '@/types/project';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Link, Unlink, Info } from 'lucide-react';

interface RoomPropertiesPanelProps {
  room: Room;
  onStartLink: () => void;
}

export function RoomPropertiesPanel({ room, onStartLink }: RoomPropertiesPanelProps) {
  const { project, dispatch } = useProject();

  const update = (changes: Partial<Room>) => {
    dispatch({ type: 'UPDATE_ROOM', id: room.id, changes });
  };

  const linkedElement = room.linkedElementId
    ? project.elements.find(el => el.id === room.linkedElementId)
    : null;

  // Resolved entity: from linked icon or from room's own entity
  const resolvedEntity = linkedElement?.ha.entity || room.entity;
  const resolvedTapAction = linkedElement?.ha.tap_action || undefined;

  return (
    <div className="w-72 bg-card border-l border-border flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Proprietà Stanza</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive"
          onClick={() => dispatch({ type: 'DELETE_ROOM', id: room.id })}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-3 space-y-4">
          {/* Room Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome Stanza</Label>
            <Input
              value={room.name}
              onChange={e => update({ name: e.target.value })}
              placeholder="Camera da letto"
              className="h-8 text-xs bg-secondary"
            />
          </div>

          {/* Linked Icon */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Icona Collegata</Label>
            {linkedElement ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-secondary rounded text-xs">
                  <Link className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="flex-1 truncate font-mono">
                    {linkedElement.ha.entity || linkedElement.ha.icon || linkedElement.label || linkedElement.id.slice(0, 8)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => update({ linkedElementId: null })}
                  >
                    <Unlink className="h-3 w-3" />
                  </Button>
                </div>
                {/* Inherited properties info */}
                <div className="p-2 bg-primary/5 border border-primary/20 rounded space-y-1">
                  <div className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Info className="h-3 w-3" />
                    Proprietà ereditate
                  </div>
                  {linkedElement.ha.entity && (
                    <div className="text-xs text-muted-foreground">
                      Entity: <span className="font-mono text-foreground">{linkedElement.ha.entity}</span>
                    </div>
                  )}
                  {linkedElement.ha.icon && (
                    <div className="text-xs text-muted-foreground">
                      Icona: <span className="font-mono text-foreground">{linkedElement.ha.icon}</span>
                    </div>
                  )}
                  {resolvedTapAction && (
                    <div className="text-xs text-muted-foreground">
                      Tap: <span className="font-mono text-foreground">{resolvedTapAction.action}</span>
                      {resolvedTapAction.service && <> → {resolvedTapAction.service}</>}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs gap-1"
                onClick={onStartLink}
              >
                <Link className="h-3 w-3" /> Collega a un'icona
              </Button>
            )}
          </div>

          {/* Entity - only editable when NOT linked */}
          {!linkedElement && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Entity ID (manuale)</Label>
              <Input
                value={room.entity}
                onChange={e => update({ entity: e.target.value })}
                placeholder="light.bedroom"
                className="h-8 text-xs bg-secondary font-mono"
              />
            </div>
          )}

          {/* Overlay Color */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Colore Overlay</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={room.overlayColor}
                onChange={e => update({ overlayColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <Input
                value={room.overlayColor}
                onChange={e => update({ overlayColor: e.target.value })}
                className="h-8 text-xs bg-secondary font-mono flex-1"
              />
            </div>
          </div>

          {/* Z-Index */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Z-Index</Label>
            <Input
              type="number"
              min={0}
              value={room.zIndex}
              onChange={e => update({ zIndex: Number(e.target.value) })}
              className="h-8 text-xs bg-secondary font-mono"
            />
          </div>

          {/* Vertices count */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Vertici</Label>
            <p className="text-xs text-muted-foreground">
              {room.polygon.length} punti — seleziona e trascina i vertici sul canvas per modificarli
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
