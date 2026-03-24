import { useState } from 'react';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { IconPicker } from '@/components/IconPicker';
import { CanvasEditor } from '@/components/CanvasEditor';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { EditorToolbar } from '@/components/EditorToolbar';
import { YamlEditor } from '@/components/YamlEditor';

const Index = () => {
  const [showYaml, setShowYaml] = useState(false);

  return (
    <ProjectProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <EditorToolbar onToggleYaml={() => setShowYaml(v => !v)} showYaml={showYaml} />
        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 flex-shrink-0">
            <IconPicker />
          </div>
          <CanvasEditor />
          {showYaml ? (
            <div className="w-80 flex-shrink-0">
              <YamlEditor />
            </div>
          ) : (
            <PropertiesPanel />
          )}
        </div>
      </div>
    </ProjectProvider>
  );
};

export default Index;
