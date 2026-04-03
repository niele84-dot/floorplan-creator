import React, { useRef, useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { exportProject } from '@/lib/export';
import { FloorplanProject } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Upload, Undo2, Redo2, FileDown, FolderOpen, Code, ClipboardPaste, GitMerge } from 'lucide-react';
import { ImportYamlDialog } from '@/components/ImportYamlDialog';
import { MergeYamlDialog } from '@/components/MergeYamlDialog';
import { toast } from 'sonner';

interface EditorToolbarProps {
  onToggleYaml?: () => void;
  showYaml?: boolean;
}

export function EditorToolbar({ onToggleYaml, showYaml }: EditorToolbarProps) {
  const { project, dispatch, canUndo, canRedo } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  const handleExport = async () => {
    try {
      await exportProject(project);
      toast.success('Project exported as ZIP');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const proj = JSON.parse(reader.result as string) as FloorplanProject;
        dispatch({ type: 'SET_PROJECT', project: proj });
        toast.success('Project loaded');
      } catch {
        toast.error('Invalid project file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveJSON = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Project JSON saved');
  };

  return (
    <header className="h-12 flex items-center px-4 border-b border-border bg-card gap-3">
      <div className="flex items-center gap-2">
        <span className="text-primary text-lg">🏠</span>
        <Input
          value={project.name}
          onChange={e => dispatch({ type: 'SET_NAME', name: e.target.value })}
          className="h-7 w-48 text-sm font-semibold bg-transparent border-none focus-visible:ring-1"
        />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo} className="h-8 gap-1 text-xs">
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </Button>
        <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo} className="h-8 gap-1 text-xs">
          <Redo2 className="h-3.5 w-3.5" /> Redo
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 gap-1 text-xs">
          <FolderOpen className="h-3.5 w-3.5" /> Load
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleLoadProject} />

        <Button variant="ghost" size="sm" onClick={handleSaveJSON} className="h-8 gap-1 text-xs">
          <FileDown className="h-3.5 w-3.5" /> Save JSON
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)} className="h-8 gap-1 text-xs">
          <ClipboardPaste className="h-3.5 w-3.5" /> Importa YAML
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setMergeOpen(true)} className="h-8 gap-1 text-xs">
          <GitMerge className="h-3.5 w-3.5" /> Merge YAML
        </Button>

        <Button
          variant={showYaml ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onToggleYaml}
          className="h-8 gap-1 text-xs"
        >
          <Code className="h-3.5 w-3.5" /> YAML
        </Button>

        <Button variant="default" size="sm" onClick={handleExport} className="h-8 gap-1 text-xs">
          <Download className="h-3.5 w-3.5" /> Export ZIP
        </Button>
      </div>
      <ImportYamlDialog open={importOpen} onOpenChange={setImportOpen} />
    </header>
  );
}
