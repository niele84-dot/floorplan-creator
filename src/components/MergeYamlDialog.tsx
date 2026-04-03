import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, GitMerge, Check, HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsYaml from 'js-yaml';
import { useProject } from '@/contexts/ProjectContext';
import { parseRoomComments } from '@/lib/export';
import { toast } from 'sonner';
import { FloorplanElement, ElementType, TapAction } from '@/types/project';

interface ParsedYamlElement {
  type: string;
  entity?: string;
  icon?: string;
  image?: string;
  title?: string;
  attribute?: string;
  prefix?: string;
  suffix?: string;
  tap_action?: any;
  hold_action?: any;
  double_tap_action?: any;
  style?: Record<string, any>;
  conditions?: any[];
  elements?: any[];
}

interface MergeMapping {
  yamlIndex: number;
  yamlEl: ParsedYamlElement;
  matchedElementId: string | null; // null = skip, 'new' = create new
  autoMatched: boolean;
  label: string;
}

interface MergeYamlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getYamlLabel(el: ParsedYamlElement): string {
  return el.entity || el.title || el.icon || el.type || 'unknown';
}

function parsePercent(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  const str = String(value).replace('%', '').trim();
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function parseRotation(transform: string | undefined): number {
  if (!transform) return 0;
  const match = String(transform).match(/rotate\((\d+(?:\.\d+)?)deg\)/);
  return match ? parseFloat(match[1]) : 0;
}

export function MergeYamlDialog({ open, onOpenChange }: MergeYamlDialogProps) {
  const { project, dispatch } = useProject();
  const [yaml, setYaml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'paste' | 'map'>('paste');
  const [mappings, setMappings] = useState<MergeMapping[]>([]);

  const handleChange = (value: string) => {
    setYaml(value);
    setError(null);
    try {
      jsYaml.load(value);
    } catch (e: any) {
      setError(e.message?.split('\n')[0] || 'YAML non valido');
    }
  };

  const handleParse = () => {
    try {
      const parsed = jsYaml.load(yaml) as any;
      if (!parsed) { setError('YAML vuoto'); return; }

      let elementsArray: any[];
      if (parsed.elements) {
        elementsArray = parsed.elements;
      } else if (Array.isArray(parsed)) {
        elementsArray = parsed;
      } else {
        setError('YAML deve contenere "elements" o essere un array');
        return;
      }

      // Build mappings
      const newMappings: MergeMapping[] = elementsArray.map((yamlEl, i) => {
        const label = getYamlLabel(yamlEl);
        const entity = yamlEl.entity || '';
        const type = yamlEl.type || '';

        // Try auto-match by entity
        const match = entity
          ? project.elements.find(ex => ex.ha.entity === entity && ex.type === type)
            || project.elements.find(ex => ex.ha.entity === entity)
          : null;

        return {
          yamlIndex: i,
          yamlEl,
          matchedElementId: match ? match.id : null,
          autoMatched: !!match,
          label,
        };
      });

      setMappings(newMappings);
      setStep('map');
    } catch (e: any) {
      setError(e.message || 'Errore nel parsing');
    }
  };

  const autoMatchedCount = useMemo(() => mappings.filter(m => m.autoMatched).length, [mappings]);
  const unmatchedMappings = useMemo(() => mappings.filter(m => !m.autoMatched), [mappings]);

  const updateMapping = (yamlIndex: number, elementId: string | null) => {
    setMappings(prev => prev.map(m =>
      m.yamlIndex === yamlIndex ? { ...m, matchedElementId: elementId } : m
    ));
  };

  const handleMerge = () => {
    let updated = 0;
    let created = 0;
    const newElements = [...project.elements];

    for (const mapping of mappings) {
      const { yamlEl, matchedElementId } = mapping;
      if (!matchedElementId || matchedElementId === '__skip__') continue;

      const style = yamlEl.style || {};
      const topPct = parsePercent(style.top);
      const leftPct = parsePercent(style.left);
      const widthPct = parsePercent(style.width);
      const rotationDeg = parseRotation(style.transform);

      let tap_action: TapAction | undefined;
      if (yamlEl.tap_action) {
        tap_action = {
          action: yamlEl.tap_action.action || 'toggle',
          navigation_path: yamlEl.tap_action.navigation_path,
          service: yamlEl.tap_action.service,
          service_data: yamlEl.tap_action.service_data,
        };
      }

      if (matchedElementId === '__new__') {
        // Create new element
        const type = (yamlEl.type || 'state-icon') as ElementType;
        let iconSetId: string | undefined;
        let iconName: string | undefined;
        if (yamlEl.icon && yamlEl.icon.includes(':')) {
          const [set, ...rest] = yamlEl.icon.split(':');
          iconSetId = set;
          iconName = rest.join(':');
        }

        const newEl: FloorplanElement = {
          id: crypto.randomUUID(),
          type,
          position: { leftPct, topPct },
          size: { widthPct: widthPct || 5, scale: 1 },
          rotationDeg,
          zIndex: newElements.length,
          ha: {
            entity: yamlEl.entity,
            icon: yamlEl.icon,
            image: yamlEl.image,
            title: yamlEl.title,
            attribute: yamlEl.attribute,
            prefix: yamlEl.prefix,
            suffix: yamlEl.suffix,
            tap_action,
          },
          iconSetId,
          iconName,
        };
        newElements.push(newEl);
        created++;
      } else {
        // Update existing element
        const idx = newElements.findIndex(el => el.id === matchedElementId);
        if (idx === -1) continue;
        const existing = newElements[idx];

        newElements[idx] = {
          ...existing,
          position: { leftPct: leftPct || existing.position.leftPct, topPct: topPct || existing.position.topPct },
          rotationDeg: rotationDeg || existing.rotationDeg,
          ha: {
            ...existing.ha,
            entity: yamlEl.entity || existing.ha.entity,
            icon: yamlEl.icon || existing.ha.icon,
            image: yamlEl.image || existing.ha.image,
            title: yamlEl.title || existing.ha.title,
            attribute: yamlEl.attribute || existing.ha.attribute,
            prefix: yamlEl.prefix || existing.ha.prefix,
            suffix: yamlEl.suffix || existing.ha.suffix,
            tap_action: tap_action || existing.ha.tap_action,
          },
        };
        updated++;
      }
    }

    dispatch({ type: 'SET_ELEMENTS', elements: newElements });

    // Handle rooms from YAML comments
    const rooms = parseRoomComments(yaml);
    if (rooms.length > 0) {
      for (const existingRoom of (project.rooms || [])) {
        dispatch({ type: 'DELETE_ROOM', id: existingRoom.id });
      }
      for (const room of rooms) {
        dispatch({ type: 'ADD_ROOM', room });
      }
    }

    toast.success(`Merge: ${updated} aggiornati, ${created} creati`);
    setYaml('');
    setError(null);
    setStep('paste');
    setMappings([]);
    onOpenChange(false);
  };

  const handleBack = () => {
    setStep('paste');
    setMappings([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            Merge YAML
          </DialogTitle>
        </DialogHeader>

        {step === 'paste' && (
          <>
            <p className="text-xs text-muted-foreground">
              Incolla il YAML. Gli elementi con lo stesso <code>entity</code> verranno aggiornati automaticamente.
              Per gli altri potrai scegliere a quale elemento associarli.
            </p>
            <Textarea
              value={yaml}
              onChange={e => handleChange(e.target.value)}
              placeholder={"elements:\n  - type: state-icon\n    entity: light.kitchen\n    style:\n      top: 30%\n      left: 15%"}
              className="min-h-[200px] font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
            {error && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                <p className="text-xs truncate">{error}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Annulla</Button>
              <Button onClick={handleParse} disabled={!yaml.trim() || !!error}>
                Analizza
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'map' && (
          <>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                <span><strong>{autoMatchedCount}</strong> elementi trovati automaticamente per entity</span>
              </p>
              {unmatchedMappings.length > 0 && (
                <p className="flex items-center gap-1">
                  <HelpCircle className="h-3 w-3 text-amber-500" />
                  <span><strong>{unmatchedMappings.length}</strong> elementi da associare manualmente</span>
                </p>
              )}
            </div>

            <ScrollArea className="max-h-[350px]">
              <div className="space-y-2 pr-2">
                {/* Auto-matched summary */}
                {autoMatchedCount > 0 && (
                  <div className="border border-border rounded-md p-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Auto-match</p>
                    {mappings.filter(m => m.autoMatched).map(m => {
                      const existing = project.elements.find(el => el.id === m.matchedElementId);
                      return (
                        <div key={m.yamlIndex} className="flex items-center gap-2 text-xs py-0.5">
                          <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span className="truncate font-mono">{m.label}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="truncate text-muted-foreground">{existing?.label || existing?.ha.entity || existing?.id.slice(0, 8)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Unmatched elements */}
                {unmatchedMappings.map(m => (
                  <div key={m.yamlIndex} className="border border-border rounded-md p-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      <span className="text-xs font-mono truncate">{m.label}</span>
                      <span className="text-[10px] text-muted-foreground">({m.yamlEl.type})</span>
                    </div>
                    <Select
                      value={m.matchedElementId || '__skip__'}
                      onValueChange={v => updateMapping(m.yamlIndex, v)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Scegli elemento..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">⏭ Salta</SelectItem>
                        <SelectItem value="__new__">➕ Crea nuovo</SelectItem>
                        {project.elements.map(el => (
                          <SelectItem key={el.id} value={el.id}>
                            {el.label || el.ha.entity || el.ha.icon || el.id.slice(0, 8)} ({el.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="ghost" onClick={handleBack}>Indietro</Button>
              <Button onClick={handleMerge}>
                <GitMerge className="h-3.5 w-3.5 mr-1" />
                Esegui Merge
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
