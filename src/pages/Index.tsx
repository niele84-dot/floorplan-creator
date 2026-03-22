import { ProjectProvider } from '@/contexts/ProjectContext';
import { IconPicker } from '@/components/IconPicker';
import { CanvasEditor } from '@/components/CanvasEditor';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { EditorToolbar } from '@/components/EditorToolbar';

const Index = () => {
  return (
    <ProjectProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <EditorToolbar />
        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 flex-shrink-0">
            <IconPicker />
          </div>
          <CanvasEditor />
          <PropertiesPanel />
        </div>
      </div>
    </ProjectProvider>
  );
};

export default Index;
