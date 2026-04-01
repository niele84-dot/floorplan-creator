import { useState } from 'react';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { IconPicker } from '@/components/IconPicker';
import { CanvasEditor } from '@/components/CanvasEditor';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { RoomPropertiesPanel } from '@/components/RoomPropertiesPanel';
import { EditorToolbar } from '@/components/EditorToolbar';
import { YamlEditor } from '@/components/YamlEditor';
import { useProject } from '@/contexts/ProjectContext';

function EditorLayout() {
  const [showYaml, setShowYaml] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [linkingRoomId, setLinkingRoomId] = useState<string | null>(null);

  const { project } = useProject();
  const selectedRoom = selectedRoomId
    ? (project.rooms || []).find(r => r.id === selectedRoomId) || null
    : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <EditorToolbar onToggleYaml={() => setShowYaml(v => !v)} showYaml={showYaml} />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <IconPicker />
        </div>
        <CanvasEditor
          drawingMode={drawingMode}
          setDrawingMode={setDrawingMode}
          selectedRoomId={selectedRoomId}
          setSelectedRoomId={setSelectedRoomId}
          linkingRoomId={linkingRoomId}
          setLinkingRoomId={setLinkingRoomId}
        />
        {showYaml ? (
          <div className="w-80 flex-shrink-0">
            <YamlEditor />
          </div>
        ) : selectedRoom ? (
          <RoomPropertiesPanel
            room={selectedRoom}
            onStartLink={() => setLinkingRoomId(selectedRoom.id)}
          />
        ) : (
          <PropertiesPanel />
        )}
      </div>
    </div>
  );
}

const Index = () => {
  return (
    <ProjectProvider>
      <EditorLayout />
    </ProjectProvider>
  );
};

export default Index;
