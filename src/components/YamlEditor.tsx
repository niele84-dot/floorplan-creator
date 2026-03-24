import React, { useState, useEffect, useCallback } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { generateYAML } from '@/lib/export';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code, Copy, Check, AlertTriangle } from 'lucide-react';
import jsYaml from 'js-yaml';
import { toast } from 'sonner';

export function YamlEditor() {
  const { project, dispatch } = useProject();
  const [yaml, setYaml] = useState('');
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generated = generateYAML(project);

  useEffect(() => {
    if (!edited) {
      setYaml(generated);
    }
  }, [generated, edited]);

  const handleChange = (value: string) => {
    setYaml(value);
    setEdited(true);
    setError(null);
    try {
      jsYaml.load(value);
    } catch (e: any) {
      setError(e.message?.split('\n')[0] || 'Invalid YAML');
    }
  };

  const handleReset = () => {
    setYaml(generated);
    setEdited(false);
    setError(null);
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(yaml);
    setCopied(true);
    toast.success('YAML copiato negli appunti');
    setTimeout(() => setCopied(false), 2000);
  }, [yaml]);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Code className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">YAML</h2>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? 'Copiato' : 'Copia'}
          </Button>
          {edited && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleReset}>
              Reset
            </Button>
          )}
        </div>
      </div>
      {error && (
        <div className="px-3 py-1.5 bg-destructive/10 border-b border-destructive/20 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
          <p className="text-[10px] text-destructive truncate">{error}</p>
        </div>
      )}
      <div className="flex-1 p-2 min-h-0">
        <Textarea
          value={yaml}
          onChange={e => handleChange(e.target.value)}
          className="h-full w-full resize-none font-mono text-xs bg-secondary border-border leading-relaxed"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
