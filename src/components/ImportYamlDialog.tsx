import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Upload } from 'lucide-react';
import jsYaml from 'js-yaml';
import { parseYAMLToElements } from '@/lib/yaml-parser';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

interface ImportYamlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportYamlDialog({ open, onOpenChange }: ImportYamlDialogProps) {
  const { project, dispatch } = useProject();
  const [yaml, setYaml] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setYaml(value);
    setError(null);
    try {
      jsYaml.load(value);
    } catch (e: any) {
      setError(e.message?.split('\n')[0] || 'YAML non valido');
    }
  };

  const handleImport = () => {
    try {
      const parsed = jsYaml.load(yaml) as any;
      if (!parsed) {
        setError('YAML vuoto');
        return;
      }

      // Support both full card format and just elements array
      let elementsArray: any[];
      if (parsed.elements) {
        elementsArray = parsed.elements;
      } else if (Array.isArray(parsed)) {
        elementsArray = parsed;
      } else {
        setError('YAML deve contenere "elements" o essere un array di elementi');
        return;
      }

      const elements = parseYAMLToElements(elementsArray, project.elements);
      dispatch({ type: 'SET_ELEMENTS', elements });
      toast.success(`Importati ${elements.length} elementi da YAML`);
      setYaml('');
      setError(null);
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message || 'Errore nel parsing del YAML');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importa YAML da Home Assistant
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Incolla il YAML di una card <code>picture-elements</code> esistente. Puoi incollare l'intera card o solo la sezione <code>elements:</code>.
        </p>
        <Textarea
          value={yaml}
          onChange={e => handleChange(e.target.value)}
          placeholder={"type: picture-elements\nimage: /local/floorplan/bg.png\nelements:\n  - type: state-icon\n    entity: light.kitchen\n    style:\n      top: 30%\n      left: 15%"}
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
          <Button onClick={handleImport} disabled={!yaml.trim() || !!error}>
            Importa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
