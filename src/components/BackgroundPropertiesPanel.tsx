import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { RotateCw, RotateCcw, Trash2, ImagePlus, Move, Maximize2 } from 'lucide-react';

interface BackgroundPropertiesPanelProps {
  onUpload: () => void;
}

export function BackgroundPropertiesPanel({ onUpload }: BackgroundPropertiesPanelProps) {
  const { project, dispatch } = useProject();
  const bg = project.backgroundImage;

  if (!bg) {
    return (
      <div className="w-full h-full bg-card flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-xs text-muted-foreground">Nessuno sfondo caricato</p>
          <Button variant="outline" size="sm" onClick={onUpload} className="gap-1.5">
            <ImagePlus className="h-3.5 w-3.5" /> Carica sfondo
          </Button>
        </div>
      </div>
    );
  }

  const scale = bg.scale ?? 1;
  const rotation = bg.rotationDeg ?? 0;
  const offsetX = bg.offsetXPct ?? 0;
  const offsetY = bg.offsetYPct ?? 0;

  const updateBg = (changes: Partial<typeof bg>) => {
    dispatch({ type: 'SET_BACKGROUND', bg: { ...bg, ...changes } });
  };

  return (
    <div className="w-full h-full bg-card flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Sfondo</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onUpload} title="Cambia sfondo">
            <ImagePlus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-6 w-6 p-0 text-destructive"
            onClick={() => dispatch({ type: 'SET_BACKGROUND', bg: null as any })}
            title="Rimuovi sfondo"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-3 space-y-4">
          {/* File info */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">File</Label>
            <p className="text-xs font-mono text-foreground truncate">{bg.filename}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Larghezza</Label>
              <p className="text-xs font-mono text-foreground">{bg.originalWidth}px</p>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Altezza</Label>
              <p className="text-xs font-mono text-foreground">{bg.originalHeight}px</p>
            </div>
          </div>

          {/* Offset */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Move className="h-3 w-3" /> Offset X: {offsetX.toFixed(1)}%
            </Label>
            <Slider
              value={[offsetX]}
              min={-50} max={50} step={0.5}
              onValueChange={([v]) => updateBg({ offsetXPct: v })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Move className="h-3 w-3" /> Offset Y: {offsetY.toFixed(1)}%
            </Label>
            <Slider
              value={[offsetY]}
              min={-50} max={50} step={0.5}
              onValueChange={([v]) => updateBg({ offsetYPct: v })}
            />
          </div>

          {/* Scale */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Scala: {Math.round(scale * 100)}%
            </Label>
            <Slider
              value={[Math.round(scale * 100)]}
              min={10} max={500} step={5}
              onValueChange={([v]) => updateBg({ scale: v / 100 })}
            />
          </div>

          {/* Rotation */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <RotateCw className="h-3 w-3" /> Rotazione: {rotation}°
            </Label>
            <Slider
              value={[rotation]}
              min={-180} max={180} step={1}
              onValueChange={([v]) => updateBg({ rotationDeg: v })}
            />
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-6 flex-1 text-xs gap-1"
                onClick={() => updateBg({ rotationDeg: rotation - 90 })}>
                <RotateCcw className="h-3 w-3" /> -90°
              </Button>
              <Button variant="outline" size="sm" className="h-6 flex-1 text-xs gap-1"
                onClick={() => updateBg({ rotationDeg: rotation + 90 })}>
                <RotateCw className="h-3 w-3" /> +90°
              </Button>
            </div>
          </div>

          {/* Reset */}
          <Button variant="ghost" size="sm" className="h-7 w-full text-xs"
            onClick={() => updateBg({ scale: 1, rotationDeg: 0, offsetXPct: 0, offsetYPct: 0 })}>
            Reset trasformazioni
          </Button>

          {/* Scale All Elements */}
          <div className="border-t border-border pt-3 space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Maximize2 className="h-3 w-3" /> Scala posizioni elementi
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Sposta proporzionalmente tutte le icone e stanze dal centro. Le dimensioni delle icone non cambiano.
            </p>
            <div className="grid grid-cols-3 gap-1">
              {[0.9, 0.95, 0.99].map(f => (
                <Button key={f} variant="outline" size="sm" className="h-6 text-xs"
                  onClick={() => dispatch({ type: 'SCALE_ALL_POSITIONS', factor: f })}>
                  {Math.round(f * 100)}%
                </Button>
              ))}
              {[1.01, 1.05, 1.1].map(f => (
                <Button key={f} variant="outline" size="sm" className="h-6 text-xs"
                  onClick={() => dispatch({ type: 'SCALE_ALL_POSITIONS', factor: f })}>
                  {Math.round(f * 100)}%
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
