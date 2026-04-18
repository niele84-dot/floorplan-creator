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
import { CollapsiblePanel } from '@/components/CollapsiblePanel';
import { Shapes, Layers, Settings, Code as CodeIcon } from 'lucide-react';

function EditorLayout() {
  const [showYaml, setShowYaml] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [linkingState, setLinkingState] = useState<{ roomId: string; mode: 'add' | 'remove' } | null>(null);
  const [isBackgroundSelected, setBackgroundSelected] = useState(false);
  const bgUploadRef = useRef<(() => void) | null>(null);

  // Per-panel collapse state
  const [iconsCollapsed, setIconsCollapsed] = useState(false);
  const [layersCollapsed, setLayersCollapsed] = useState(false);
  const [propsCollapsed, setPropsCollapsed] = useState(false);

  const { project, setSelectedElementId } = useProject();
  const selectedRoom = selectedRoomId
    ? (project.rooms || []).find(r => r.id === selectedRoomId) || null
    : null;

  const handleSetSelectedRoomId = (id: string | null) => {
    setSelectedRoomId(id);
    if (id) setBackgroundSelected(false);
  };

  const rightPanelTitle = showYaml
    ? 'YAML'
    : isBackgroundSelected
    ? 'Sfondo'
    : selectedRoom
    ? 'Stanza'
    : 'Proprietà';

  const rightPanelIcon = showYaml ? CodeIcon : Settings;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <EditorToolbar onToggleYaml={() => setShowYaml(v => !v)} showYaml={showYaml} />
      <div className="flex-1 flex overflow-hidden">
        <CollapsiblePanel
          side="left"
          title="Icone"
          icon={Shapes}
          collapsed={iconsCollapsed}
          onToggle={() => setIconsCollapsed(v => !v)}
          width="w-64"
        >
          <IconPicker />
        </CollapsiblePanel>

        <CollapsiblePanel
          side="left"
          title="Livelli"
          icon={Layers}
          collapsed={layersCollapsed}
          onToggle={() => setLayersCollapsed(v => !v)}
          width="w-56"
        >
          <LayerPanel
            selectedRoomId={selectedRoomId}
            setSelectedRoomId={handleSetSelectedRoomId}
            isBackgroundSelected={isBackgroundSelected}
            setBackgroundSelected={setBackgroundSelected}
          />
        </CollapsiblePanel>

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

        <CollapsiblePanel
          side="right"
          title={rightPanelTitle}
          icon={rightPanelIcon}
          collapsed={propsCollapsed}
          onToggle={() => setPropsCollapsed(v => !v)}
          width="w-80"
        >
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
        </CollapsiblePanel>
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
