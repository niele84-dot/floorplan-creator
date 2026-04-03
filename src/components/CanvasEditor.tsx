import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { FloorplanElement, RoomPoint, Room } from '@/types/project';
import { Grid3X3, ZoomIn, ZoomOut, Maximize, PenTool, Magnet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { RoomOverlay } from '@/components/RoomOverlay';
import { toast } from 'sonner';

interface CanvasEditorProps {
  drawingMode: boolean;
  setDrawingMode: (v: boolean) => void;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  linkingRoomId: string | null;
  setLinkingRoomId: (id: string | null) => void;
}

export function CanvasEditor({
  drawingMode,
  setDrawingMode,
  selectedRoomId,
  setSelectedRoomId,
  linkingRoomId,
  setLinkingRoomId,
}: CanvasEditorProps) {
  const { project, dispatch, selectedElementId, setSelectedElementId } = useProject();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Room drawing state
  const [drawingPoints, setDrawingPoints] = useState<RoomPoint[]>([]);
  const [cursorPos, setCursorPos] = useState<RoomPoint | null>(null);

  const gridSize = 5;
  const snapValue = (v: number) => snapToGrid ? Math.round(v / gridSize) * gridSize : v;

  const getImageRect = useCallback(() => {
    if (!imageRef.current) return null;
    return imageRef.current.getBoundingClientRect();
  }, []);

  const getPctFromEvent = useCallback((e: React.MouseEvent | MouseEvent): RoomPoint | null => {
    const imgRect = getImageRect();
    if (!imgRect) return null;
    return {
      leftPct: snapValue(Math.max(0, Math.min(100, ((e.clientX - imgRect.left) / imgRect.width) * 100))),
      topPct: snapValue(Math.max(0, Math.min(100, ((e.clientY - imgRect.top) / imgRect.height) * 100))),
    };
  }, [getImageRect, snapToGrid]);

  // Close polygon check
  const isNearFirstPoint = (pt: RoomPoint) => {
    if (drawingPoints.length < 3) return false;
    const first = drawingPoints[0];
    return Math.abs(pt.leftPct - first.leftPct) < 1.5 && Math.abs(pt.topPct - first.topPct) < 1.5;
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 3) {
      setDrawingPoints([]);
      return;
    }
    const newRoom: Room = {
      id: crypto.randomUUID(),
      name: `Stanza ${(project.rooms || []).length + 1}`,
      polygon: drawingPoints,
      linkedElementId: null,
      entity: '',
      overlayColor: '#FFA500',
      zIndex: 0,
    };
    dispatch({ type: 'ADD_ROOM', room: newRoom });
    setDrawingPoints([]);
    setDrawingMode(false);
    setSelectedRoomId(newRoom.id);
    setSelectedElementId(null);
    toast.success(`Stanza "${newRoom.name}" creata con ${drawingPoints.length} vertici`);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!drawingMode) return;
    const pt = getPctFromEvent(e);
    if (!pt) return;

    if (isNearFirstPoint(pt)) {
      finishDrawing();
      return;
    }

    setDrawingPoints(prev => [...prev, pt]);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (drawingMode && drawingPoints.length >= 3) {
      e.preventDefault();
      finishDrawing();
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (drawingMode) {
      const pt = getPctFromEvent(e);
      setCursorPos(pt);
    }
  };

  // Linking mode: click on an icon to link it to a room
  const handleElementClick = (e: React.MouseEvent, el: FloorplanElement) => {
    if (linkingRoomId) {
      e.stopPropagation();
      dispatch({ type: 'UPDATE_ROOM', id: linkingRoomId, changes: { linkedElementId: el.id } });
      setLinkingRoomId(null);
      toast.success(`Stanza collegata a ${el.ha.entity || el.label || el.ha.icon || 'elemento'}`);
      return;
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (drawingMode) return;
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    try {
      const iconData = JSON.parse(data);
      if (iconData.type !== 'icon-drop') return;
      const imgRect = getImageRect();
      if (!imgRect) return;

      const leftPct = snapValue(((e.clientX - imgRect.left) / imgRect.width) * 100);
      const topPct = snapValue(((e.clientY - imgRect.top) / imgRect.height) * 100);

      const isMdi = iconData.isMdi;
      const newEl: FloorplanElement = {
        id: crypto.randomUUID(),
        type: isMdi ? 'state-icon' : 'image',
        position: { leftPct: Math.max(0, Math.min(100, leftPct)), topPct: Math.max(0, Math.min(100, topPct)) },
        size: { widthPct: 5, scale: 1 },
        rotationDeg: 0,
        zIndex: project.elements.length,
        ha: {
          icon: isMdi ? `mdi:${iconData.name}` : undefined,
          image: !isMdi ? `/local/floorplan/icons/${iconData.prefix}-${iconData.name}.svg` : undefined,
        },
        iconSetId: iconData.prefix,
        iconName: iconData.name,
        assetRef: !isMdi ? `${iconData.prefix}-${iconData.name}.svg` : undefined,
        label: iconData.name,
      };
      dispatch({ type: 'ADD_ELEMENT', element: newEl });
      setSelectedElementId(newEl.id);
    } catch { /* ignore */ }
  }, [dispatch, getImageRect, project.elements.length, setSelectedElementId, snapToGrid, drawingMode]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };

  const handleBgUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      if (isSvg) {
        // For SVG: parse viewBox/width/height from the markup to get dimensions
        const textReader = new FileReader();
        textReader.onload = () => {
          const svgText = textReader.result as string;
          let w = 1920, h = 1080; // sensible defaults
          const vbMatch = svgText.match(/viewBox=["']([^"']+)["']/);
          if (vbMatch) {
            const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
            if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
              w = parts[2];
              h = parts[3];
            }
          }
          // Explicit width/height override viewBox
          const wMatch = svgText.match(/<svg[^>]*\swidth=["'](\d+(?:\.\d+)?)/);
          const hMatch = svgText.match(/<svg[^>]*\sheight=["'](\d+(?:\.\d+)?)/);
          if (wMatch) w = parseFloat(wMatch[1]);
          if (hMatch) h = parseFloat(hMatch[1]);

          dispatch({
            type: 'SET_BACKGROUND',
            bg: { filename: file.name, originalWidth: w, originalHeight: h, dataUrl },
          });
        };
        textReader.readAsText(file);
      } else {
        const img = new Image();
        img.onload = () => {
          dispatch({
            type: 'SET_BACKGROUND',
            bg: {
              filename: file.name,
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight,
              dataUrl,
            },
          });
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  }, [dispatch]);

  const handleElementMouseDown = (e: React.MouseEvent, el: FloorplanElement) => {
    if (drawingMode || linkingRoomId) return;
    e.stopPropagation();
    setSelectedElementId(el.id);
    setSelectedRoomId(null);
    setDragging({
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: el.position.leftPct,
      startTop: el.position.topPct,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging) {
      const imgRect = getImageRect();
      if (!imgRect) return;
      const dx = ((e.clientX - dragging.startX) / imgRect.width) * 100;
      const dy = ((e.clientY - dragging.startY) / imgRect.height) * 100;
      const newLeft = snapValue(Math.max(0, Math.min(100, dragging.startLeft + dx)));
      const newTop = snapValue(Math.max(0, Math.min(100, dragging.startTop + dy)));
      dispatch({
        type: 'UPDATE_ELEMENT',
        id: dragging.id,
        changes: { position: { leftPct: newLeft, topPct: newTop } },
      });
    }
    if (isPanning) {
      setPan(prev => ({
        x: prev.x + (e.clientX - panStart.x),
        y: prev.y + (e.clientY - panStart.y),
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [dragging, isPanning, panStart, getImageRect, dispatch, snapToGrid]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Escape to cancel drawing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawingMode) {
        setDrawingPoints([]);
        setDrawingMode(false);
      }
      if (e.key === 'Escape' && linkingRoomId) {
        setLinkingRoomId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drawingMode, linkingRoomId]);

  // Keyboard shortcuts for elements
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (drawingMode) return;
      if (!selectedElementId) return;
      const el = project.elements.find(el => el.id === selectedElementId);
      if (!el) return;
      const step = e.shiftKey ? 1 : 0.5;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          dispatch({ type: 'UPDATE_ELEMENT', id: el.id, changes: { position: { ...el.position, topPct: Math.max(0, el.position.topPct - step) } } });
          break;
        case 'ArrowDown':
          e.preventDefault();
          dispatch({ type: 'UPDATE_ELEMENT', id: el.id, changes: { position: { ...el.position, topPct: Math.min(100, el.position.topPct + step) } } });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          dispatch({ type: 'UPDATE_ELEMENT', id: el.id, changes: { position: { ...el.position, leftPct: Math.max(0, el.position.leftPct - step) } } });
          break;
        case 'ArrowRight':
          e.preventDefault();
          dispatch({ type: 'UPDATE_ELEMENT', id: el.id, changes: { position: { ...el.position, leftPct: Math.min(100, el.position.leftPct + step) } } });
          break;
        case 'Delete':
        case 'Backspace':
          if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            dispatch({ type: 'DELETE_ELEMENT', id: el.id });
          }
          break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            dispatch({ type: 'DUPLICATE_ELEMENT', id: el.id });
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedElementId, project.elements, dispatch, drawingMode]);

  // Delete selected room
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (drawingMode) return;
      if (!selectedRoomId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          dispatch({ type: 'DELETE_ROOM', id: selectedRoomId });
          setSelectedRoomId(null);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedRoomId, dispatch, drawingMode]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (drawingMode) return;
    if (e.target === containerRef.current || e.target === imageRef.current) {
      setSelectedElementId(null);
      setSelectedRoomId(null);
      if (e.button === 1 || e.altKey) {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(0.2, Math.min(5, z - e.deltaY * 0.001)));
    }
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleRoomVertexDrag = (roomId: string, vertexIndex: number, leftPct: number, topPct: number) => {
    const room = (project.rooms || []).find(r => r.id === roomId);
    if (!room) return;
    const newPolygon = [...room.polygon];
    newPolygon[vertexIndex] = { leftPct: snapValue(leftPct), topPct: snapValue(topPct) };
    dispatch({ type: 'UPDATE_ROOM', id: roomId, changes: { polygon: newPolygon } });
  };

  // Build drawing polygon preview points string
  const drawingPreviewPoints = drawingPoints.length > 0
    ? drawingPoints.map(p => `${p.leftPct}%,${p.topPct}%`).join(' ')
    : '';

  const rooms = project.rooms || [];

  return (
    <div className="flex-1 flex flex-col bg-canvas-bg overflow-hidden">
      {/* Toolbar */}
      <div className="h-10 flex items-center gap-1 px-2 border-b border-border bg-card">
        <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="h-7 w-7 p-0">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="h-7 w-7 p-0">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={resetView} className="h-7 w-7 p-0">
          <Maximize className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Toggle size="sm" pressed={showGrid} onPressedChange={setShowGrid} className="h-7 px-2 text-xs gap-1">
          <Grid3X3 className="h-3.5 w-3.5" /> Grid
        </Toggle>
        <Toggle size="sm" pressed={snapToGrid} onPressedChange={setSnapToGrid} className="h-7 px-2 text-xs gap-1">
          <Magnet className="h-3.5 w-3.5" /> Snap
        </Toggle>
        <div className="w-px h-5 bg-border mx-1" />
        <Toggle
          size="sm"
          pressed={drawingMode}
          onPressedChange={(v) => {
            setDrawingMode(v);
            if (v) {
              setDrawingPoints([]);
              setSelectedElementId(null);
              setSelectedRoomId(null);
            }
          }}
          className="h-7 px-2 text-xs gap-1"
        >
          <PenTool className="h-3.5 w-3.5" /> Disegna Stanza
        </Toggle>
        {drawingMode && drawingPoints.length > 0 && (
          <span className="text-xs text-muted-foreground ml-2">
            {drawingPoints.length} punti — doppio-click o click sul primo per chiudere
          </span>
        )}
        {linkingRoomId && (
          <span className="text-xs text-primary ml-2 animate-pulse">
            🔗 Clicca su un'icona per collegare la stanza
          </span>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden relative ${drawingMode ? 'cursor-crosshair' : linkingRoomId ? 'cursor-pointer' : 'cursor-default'}`}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseMove={handleCanvasMouseMove}
      >
        {!project.backgroundImage ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
              <div className="text-4xl">🏠</div>
              <span className="text-sm text-muted-foreground">Upload a floorplan image</span>
              <span className="text-xs text-muted-foreground">PNG, JPG, or SVG</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
            </label>
          </div>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center' }}
          >
            <div className="relative inline-block">
              <img
                ref={imageRef}
                src={project.backgroundImage.dataUrl}
                alt="Floorplan"
                className="max-w-full max-h-[80vh] select-none"
                draggable={false}
              />
              {/* Grid overlay */}
              {showGrid && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
                  {Array.from({ length: 19 }, (_, i) => (
                    <React.Fragment key={i}>
                      <line x1={`${(i + 1) * 5}%`} y1="0" x2={`${(i + 1) * 5}%`} y2="100%" stroke="hsl(var(--canvas-grid))" strokeWidth="1" />
                      <line x1="0" y1={`${(i + 1) * 5}%`} x2="100%" y2={`${(i + 1) * 5}%`} stroke="hsl(var(--canvas-grid))" strokeWidth="1" />
                    </React.Fragment>
                  ))}
                </svg>
              )}

              {/* Room overlays SVG layer — below icons */}
              <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: drawingMode ? 'none' : 'auto' }}>
                {rooms.map(room => (
                  <RoomOverlay
                    key={room.id}
                    room={room}
                    isSelected={selectedRoomId === room.id}
                    isLinkTarget={linkingRoomId === room.id}
                    showVertices={selectedRoomId === room.id && !drawingMode}
                    onSelect={() => {
                      if (drawingMode) return;
                      setSelectedRoomId(room.id);
                      setSelectedElementId(null);
                    }}
                    onStartLink={() => {
                      setLinkingRoomId(room.id);
                    }}
                    onVertexDrag={(idx, left, top) => handleRoomVertexDrag(room.id, idx, left, top)}
                  />
                ))}
                {/* Drawing preview */}
                {drawingMode && drawingPoints.length > 0 && (
                  <>
                    <polygon
                      points={drawingPreviewPoints}
                      fill="#FFA500"
                      fillOpacity={0.15}
                      stroke="#FFA500"
                      strokeWidth="2"
                      strokeDasharray="6 3"
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Cursor line to next point */}
                    {cursorPos && (
                      <line
                        x1={`${drawingPoints[drawingPoints.length - 1].leftPct}%`}
                        y1={`${drawingPoints[drawingPoints.length - 1].topPct}%`}
                        x2={`${cursorPos.leftPct}%`}
                        y2={`${cursorPos.topPct}%`}
                        stroke="#FFA500"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                    {/* Vertex dots */}
                    {drawingPoints.map((p, i) => (
                      <circle
                        key={i}
                        cx={`${p.leftPct}%`}
                        cy={`${p.topPct}%`}
                        r={i === 0 && drawingPoints.length >= 3 ? 7 : 4}
                        fill={i === 0 && drawingPoints.length >= 3 ? '#22c55e' : '#FFA500'}
                        stroke="white"
                        strokeWidth="2"
                        style={{ pointerEvents: 'none' }}
                      />
                    ))}
                  </>
                )}
                {/* Link lines between rooms and their linked icons */}
                {rooms.filter(r => r.linkedElementId).map(room => {
                  const linkedEl = project.elements.find(e => e.id === room.linkedElementId);
                  if (!linkedEl) return null;
                  const cx = room.polygon.reduce((s, p) => s + p.leftPct, 0) / room.polygon.length;
                  const cy = room.polygon.reduce((s, p) => s + p.topPct, 0) / room.polygon.length;
                  return (
                    <line
                      key={`link-${room.id}`}
                      x1={`${cx}%`}
                      y1={`${cy}%`}
                      x2={`${linkedEl.position.leftPct}%`}
                      y2={`${linkedEl.position.topPct}%`}
                      stroke="hsl(var(--primary))"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                      strokeOpacity={selectedRoomId === room.id ? 0.8 : 0.3}
                      style={{ pointerEvents: 'none' }}
                    />
                  );
                })}
              </svg>

              {/* Elements */}
              {project.elements
                .sort((a, b) => a.zIndex - b.zIndex)
                .map(el => (
                  <div
                    key={el.id}
                    className={`absolute cursor-move select-none transition-shadow ${
                      linkingRoomId ? 'ring-2 ring-cyan-400 ring-offset-1 animate-pulse cursor-pointer' :
                      selectedElementId === el.id
                        ? 'ring-2 ring-primary rounded-sm shadow-lg'
                        : 'hover:ring-1 hover:ring-primary/50 rounded-sm'
                    }`}
                    style={{
                      left: `${el.position.leftPct}%`,
                      top: `${el.position.topPct}%`,
                      transform: `translate(-50%, -50%) rotate(${el.rotationDeg}deg) scale(${el.size.scale || 1})`,
                      zIndex: el.zIndex + 10,
                      width: el.size.widthPct ? `${el.size.widthPct}%` : 'auto',
                      height: el.size.heightPct ? `${el.size.heightPct}%` : 'auto',
                    }}
                    onMouseDown={e => handleElementMouseDown(e, el)}
                    onClick={e => handleElementClick(e, el)}
                  >
                    <div className="flex items-center justify-center min-w-[24px] min-h-[24px] p-1">
                      {el.ha.icon ? (
                        <img
                          src={`https://api.iconify.design/${el.iconSetId || 'mdi'}/${el.iconName || el.ha.icon.replace('mdi:', '')}.svg?color=%2394a3b8`}
                          alt={el.label || el.ha.icon}
                          className="w-full h-full"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-6 h-6 bg-primary/20 rounded-sm flex items-center justify-center text-[10px] text-primary">
                          {el.type[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    {selectedElementId === el.id && (
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-primary font-mono whitespace-nowrap bg-card/90 px-1 rounded">
                        {el.position.leftPct.toFixed(1)}%, {el.position.topPct.toFixed(1)}%
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
