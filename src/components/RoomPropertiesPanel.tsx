import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Room } from '@/types/project';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Link, Unlink, Info, Plus, Minus } from 'lucide-react';
import { NumberStepper } from '@/components/ui/number-stepper';

interface RoomPropertiesPanelProps {
  room: Room;
  onStartAddLink: () => void;
  onStartRemoveLink: () => void;
}

export function RoomPropertiesPanel({ room, onStartAddLink, onStartRemoveLink }: RoomPropertiesPanelProps) {
  const { project, dispatch } = useProject();

  const update = (changes: Partial<Room>) => {
    dispatch({ type: 'UPDATE_ROOM', id: room.id, changes });
  };

  const linkedIds = room.linkedElementIds || [];
  const linkedElements = linkedIds
    .map(id => project.elements.find(el => el.id === id))
    .filter((el): el is NonNullable<typeof el> => Boolean(el));

  // Primary linked element (first) is used for inheritance
  const primary = linkedElements[0] || null;
  const resolvedTapAction = primary?.ha.tap_action || undefined;

  const removeLink = (id: string) => {
    update({ linkedElementIds: linkedIds.filter(l => l !== id) });
  };

  // Centroid (average of vertices) used as room position handle
  const centroid = room.polygon.length > 0
    ? {
        leftPct: room.polygon.reduce((s, p) => s + p.leftPct, 0) / room.polygon.length,
        topPct: room.polygon.reduce((s, p) => s + p.topPct, 0) / room.polygon.length,
      }
    : { leftPct: 50, topPct: 50 };

  const movePolygon = (deltaLeft: number, deltaTop: number) => {
    update({
      polygon: room.polygon.map(p => ({
        leftPct: Math.max(0, Math.min(100, p.leftPct + deltaLeft)),
        topPct: Math.max(0, Math.min(100, p.topPct + deltaTop)),
      })),
    });
  };

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

          {/* Linked Icons (multiple) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Icone Collegate {linkedElements.length > 0 && `(${linkedElements.length})`}
            </Label>
            {linkedElements.length > 0 && (
              <div className="space-y-1">
                {linkedElements.map((el, idx) => (
                  <div key={el.id} className="flex items-center gap-2 p-2 bg-secondary rounded text-xs">
                    <Link className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="flex-1 truncate font-mono">
                      {el.ha.entity || el.ha.icon || el.label || el.id.slice(0, 8)}
                    </span>
                    {idx === 0 && linkedElements.length > 1 && (
                      <span className="text-[9px] uppercase font-semibold text-primary">primaria</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => removeLink(el.id)}
                    >
                      <Unlink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={onStartAddLink}
              >
                <Plus className="h-3 w-3" />
                Aggiungi
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={onStartRemoveLink}
                disabled={linkedElements.length === 0}
              >
                <Minus className="h-3 w-3" />
                Rimuovi
              </Button>
            </div>
            {/* Inherited properties info */}
            {primary && (
              <div className="p-2 bg-primary/5 border border-primary/20 rounded space-y-1 mt-2">
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  <Info className="h-3 w-3" />
                  Proprietà ereditate (dalla primaria)
                </div>
                {primary.ha.entity && (
                  <div className="text-xs text-muted-foreground">
                    Entity: <span className="font-mono text-foreground">{primary.ha.entity}</span>
                  </div>
                )}
                {primary.ha.icon && (
                  <div className="text-xs text-muted-foreground">
                    Icona: <span className="font-mono text-foreground">{primary.ha.icon}</span>
                  </div>
                )}
                {resolvedTapAction && (
                  <div className="text-xs text-muted-foreground">
                    Tap: <span className="font-mono text-foreground">{resolvedTapAction.action}</span>
                    {resolvedTapAction.service && <> → {resolvedTapAction.service}</>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Entity - only editable when no icons are linked */}
          {linkedElements.length === 0 && (
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
