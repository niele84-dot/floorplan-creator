import { useState, useRef } from 'react';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { IconPicker } from '@/components/IconPicker';
import { CanvasEditor } from '@/components/CanvasEditor';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { RoomPropertiesPanel } from '@/components/RoomPropertiesPanel';
import { BackgroundPropertiesPanel } from '@/components/BackgroundPropertiesPanel';
import { EditorToolbar } from '@/components/EditorToolbar';
import { YamlEditor } from '@/components/YamlEditor';
import { LayerPanel } from '@/components/LayerPanel';
import { useProject } from '@/contexts/ProjectContext';

interface EditorLayoutProps {
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  setLeftPanelCollapsed: (v: boolean) => void;
  setRightPanelCollapsed: (v: boolean) => void;
}

function EditorLayout({ leftPanelCollapsed, rightPanelCollapsed, setLeftPanelCollapsed, setRightPanelCollapsed }: EditorLayoutProps) {
  const [showYaml, setShowYaml] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [linkingRoomId, setLinkingRoomId] = useState<string | null>(null);
  const [isBackgroundSelected, setBackgroundSelected] = useState(false);
  const bgUploadRef = useRef<(() => void) | null>(null);

  const { project, setSelectedElementId } = useProject();
  const selectedRoom = selectedRoomId
    ? (project.rooms || []).find(r => r.id === selectedRoomId) || null
    : null;

  // When an element or room is selected, deselect background
  const handleSetSelectedRoomId = (id: string | null) => {
    setSelectedRoomId(id);
    if (id) setBackgroundSelected(false);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <EditorToolbar 
        onToggleYaml={() => setShowYaml(v => !v)} 
        showYaml={showYaml}
        leftPanelCollapsed={leftPanelCollapsed}
        rightPanelCollapsed={rightPanelCollapsed}
        onToggleLeftPanel={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
        onToggleRightPanel={() => setRightPanelCollapsed(!rightPanelCollapsed)}
      />
      <div className="flex-1 flex overflow-hidden">
        {!leftPanelCollapsed && (
          <div className="flex-shrink-0 flex">
            <div className="w-64 flex-shrink-0 border-r border-border bg-card">
              <IconPicker />
            </div>
            <div className="w-56 flex-shrink-0 border-r border-border bg-card">
              <LayerPanel
                selectedRoomId={selectedRoomId}
                setSelectedRoomId={handleSetSelectedRoomId}
                isBackgroundSelected={isBackgroundSelected}
                setBackgroundSelected={setBackgroundSelected}
              />
            </div>
          </div>
        )}
        <CanvasEditor
          drawingMode={drawingMode}
          setDrawingMode={setDrawingMode}
          selectedRoomId={selectedRoomId}
          setSelectedRoomId={handleSetSelectedRoomId}
          linkingRoomId={linkingRoomId}
          setLinkingRoomId={setLinkingRoomId}
          onBgUploadRef={(fn) => { bgUploadRef.current = fn; }}
          onElementSelected={() => setBackgroundSelected(false)}
          isBackgroundSelected={isBackgroundSelected}
        />
        {!rightPanelCollapsed && (
          <div className="w-80 flex-shrink-0 border-l border-border bg-card">
            {showYaml ? (
              <YamlEditor />
            ) : isBackgroundSelected ? (
              <BackgroundPropertiesPanel onUpload={() => bgUploadRef.current?.()} />
            ) : selectedRoom ? (
              <RoomPropertiesPanel
                room={selectedRoom}
                onStartLink={() => setLinkingRoomId(selectedRoom.id)}
              />
            ) : (
              <PropertiesPanel />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const Index = () => {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  return (
    <ProjectProvider>
      <EditorLayout 
        leftPanelCollapsed={leftPanelCollapsed}
        rightPanelCollapsed={rightPanelCollapsed}
        setLeftPanelCollapsed={setLeftPanelCollapsed}
        setRightPanelCollapsed={setRightPanelCollapsed}
      />
    </ProjectProvider>
  );
};

export default Index;
