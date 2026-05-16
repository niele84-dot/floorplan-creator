import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { ElementType, TapAction, FloorplanElement } from '@/types/project';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Trash2, Copy, ArrowUp, ArrowDown, RotateCw, Lock, Unlock } from 'lucide-react';
import { NumberStepper } from '@/components/ui/number-stepper';

const ELEMENT_TYPES: { value: ElementType; label: string }[] = [
  { value: 'state-icon', label: 'State Icon' },
  { value: 'state-label', label: 'State Label' },
  { value: 'icon', label: 'Static Icon' },
  { value: 'image', label: 'Image' },
  { value: 'action-button', label: 'Action Button' },
  { value: 'conditional', label: 'Conditional' },
];

const TAP_ACTIONS: { value: string; label: string }[] = [
  { value: 'toggle', label: 'Toggle' },
  { value: 'more-info', label: 'More Info' },
  { value: 'navigate', label: 'Navigate' },
  { value: 'call-service', label: 'Call Service' },
  { value: 'perform-action', label: 'Perform Action' },
  { value: 'none', label: 'None' },
];

export function PropertiesPanel() {
  const { project, selectedElementId, dispatch } = useProject();
  const element = project.elements.find(el => el.id === selectedElementId);

  if (!element) {
    return (
      <div className="w-72 bg-card border-l border-border flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          Select an element on the canvas to edit its properties
        </p>
      </div>
    );
  }

  const update = (changes: Partial<FloorplanElement>) => {
    dispatch({ type: 'UPDATE_ELEMENT', id: element.id, changes });
  };

  const updateHA = (changes: Partial<FloorplanElement['ha']>) => {
    update({ ha: { ...element.ha, ...changes } });
  };

  const updateTapAction = (changes: Partial<TapAction>) => {
    updateHA({ tap_action: { ...element.ha.tap_action, action: 'toggle', ...changes } });
  };

  return (
    <div className="w-72 bg-card border-l border-border flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Properties</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => dispatch({ type: 'DUPLICATE_ELEMENT', id: element.id })}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => dispatch({ type: 'REORDER_ELEMENT', id: element.id, direction: 'forward' })}>
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => dispatch({ type: 'REORDER_ELEMENT', id: element.id, direction: 'backward' })}>
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => dispatch({ type: 'DELETE_ELEMENT', id: element.id })}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-3 space-y-4">
          {/* Element Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Element Type</Label>
            <Select value={element.type} onValueChange={(v: ElementType) => update({ type: v })}>
              <SelectTrigger className="h-8 text-xs bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ELEMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Entity ID */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Entity ID</Label>
            <Input
              value={element.ha.entity || ''}
              onChange={e => updateHA({ entity: e.target.value })}
              placeholder="light.kitchen"
              className="h-8 text-xs bg-secondary font-mono"
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Posizione</Label>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-10">Left %</span>
                <NumberStepper
                  value={element.position.leftPct}
                  min={0}
                  max={100}
                  step={0.5}
                  onChange={v => update({ position: { ...element.position, leftPct: v } })}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-10">Top %</span>
                <NumberStepper
                  value={element.position.topPct}
                  min={0}
                  max={100}
                  step={0.5}
                  onChange={v => update({ position: { ...element.position, topPct: v } })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Size</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => update({ size: { ...element.size, lockAspectRatio: !element.size.lockAspectRatio } })}
                title={element.size.lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
              >
                {element.size.lockAspectRatio ? <Lock className="h-3 w-3 text-primary" /> : <Unlock className="h-3 w-3 text-muted-foreground" />}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Width %</Label>
                <Input
                  type="number" min={0.5} max={100} step={0.5}
                  value={element.size.widthPct || 5}
                  onChange={e => {
                    const w = Number(e.target.value);
                    const ratio = (element.size.widthPct || 5) / (element.size.heightPct || element.size.widthPct || 5);
                    update({
                      size: {
                        ...element.size,
                        widthPct: w,
                        ...(element.size.lockAspectRatio ? { heightPct: w / ratio } : {}),
                      },
                    });
                  }}
                  className="h-8 text-xs bg-secondary font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Height %</Label>
                <Input
                  type="number" min={0.5} max={100} step={0.5}
                  value={element.size.heightPct || element.size.widthPct || 5}
                  onChange={e => {
                    const h = Number(e.target.value);
                    const ratio = (element.size.widthPct || 5) / (element.size.heightPct || element.size.widthPct || 5);
                    update({
                      size: {
                        ...element.size,
                        heightPct: h,
                        ...(element.size.lockAspectRatio ? { widthPct: h * ratio } : {}),
                      },
                    });
                  }}
                  className="h-8 text-xs bg-secondary font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Scale: {(element.size.scale || 1).toFixed(1)}x</Label>
              <Slider
                value={[element.size.scale || 1]}
                min={0.2} max={5} step={0.1}
                onValueChange={([v]) => update({ size: { ...element.size, scale: v } })}
              />
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <RotateCw className="h-3 w-3" /> Rotation: {element.rotationDeg}°
            </Label>
            <Slider
              value={[element.rotationDeg]}
              min={0} max={360} step={1}
              onValueChange={([v]) => update({ rotationDeg: v })}
            />
          </div>

          {/* Z-Index */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Z-Index</Label>
            <Input
              type="number" min={0}
              value={element.zIndex}
              onChange={e => update({ zIndex: Number(e.target.value) })}
              className="h-8 text-xs bg-secondary font-mono"
            />
          </div>

          {/* Icon */}
          {element.ha.icon && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Icon</Label>
              <Input
                value={element.ha.icon}
                onChange={e => updateHA({ icon: e.target.value })}
                className="h-8 text-xs bg-secondary font-mono"
              />
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={element.ha.title || ''}
              onChange={e => updateHA({ title: e.target.value })}
              placeholder="Kitchen Light"
              className="h-8 text-xs bg-secondary"
            />
          </div>

          {/* State Label specifics */}
          {element.type === 'state-label' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Prefix</Label>
                <Input value={element.ha.prefix || ''} onChange={e => updateHA({ prefix: e.target.value })} className="h-8 text-xs bg-secondary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Suffix</Label>
                <Input value={element.ha.suffix || ''} onChange={e => updateHA({ suffix: e.target.value })} className="h-8 text-xs bg-secondary" />
              </div>
            </div>
          )}

          {/* Attribute */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Attribute</Label>
            <Input
              value={element.ha.attribute || ''}
              onChange={e => updateHA({ attribute: e.target.value })}
              placeholder="brightness"
              className="h-8 text-xs bg-secondary font-mono"
            />
          </div>

          {/* Tap Action */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tap Action</Label>
            <Select value={element.ha.tap_action?.action || 'toggle'} onValueChange={v => updateTapAction({ action: v as TapAction['action'] })}>
              <SelectTrigger className="h-8 text-xs bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TAP_ACTIONS.map(a => <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {element.ha.tap_action?.action === 'navigate' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Navigation Path</Label>
              <Input
                value={element.ha.tap_action.navigation_path || ''}
                onChange={e => updateTapAction({ navigation_path: e.target.value })}
                placeholder="/lovelace/floor2"
                className="h-8 text-xs bg-secondary font-mono"
              />
            </div>
          )}

          {/* Conditional conditions */}
          {element.type === 'conditional' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Condition Entity</Label>
              <Input
                value={element.ha.conditions?.[0]?.entity || ''}
                onChange={e => updateHA({ conditions: [{ entity: e.target.value, state: element.ha.conditions?.[0]?.state || 'on' }] })}
                placeholder="binary_sensor.motion"
                className="h-8 text-xs bg-secondary font-mono"
              />
              <Label className="text-xs text-muted-foreground mt-1">Required State</Label>
              <Input
                value={element.ha.conditions?.[0]?.state || ''}
                onChange={e => updateHA({ conditions: [{ entity: element.ha.conditions?.[0]?.entity || '', state: e.target.value }] })}
                placeholder="on"
                className="h-8 text-xs bg-secondary font-mono"
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
