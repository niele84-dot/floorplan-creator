import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { FloorplanElement } from '@/types/project';
import { Grid3X3, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

export function CanvasEditor() {
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

  const gridSize = 5; // 5% grid

  const snapValue = (v: number) => snapToGrid ? Math.round(v / gridSize) * gridSize : v;

  const getImageRect = useCallback(() => {
    if (!imageRef.current) return null;
    return imageRef.current.getBoundingClientRect();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
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
  }, [dispatch, getImageRect, project.elements.length, setSelectedElementId, snapToGrid]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };

  const handleBgUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        dispatch({
          type: 'SET_BACKGROUND',
          bg: {
            filename: file.name,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            dataUrl: reader.result as string,
          },
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, [dispatch]);

  const handleElementMouseDown = (e: React.MouseEvent, el: FloorplanElement) => {
    e.stopPropagation();
    setSelectedElementId(el.id);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
  }, [selectedElementId, project.elements, dispatch]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || e.target === imageRef.current) {
      setSelectedElementId(null);
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
        <Toggle size="sm" pressed={snapToGrid} onPressedChange={setSnapToGrid} className="h-7 px-2 text-xs">
          Snap
        </Toggle>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative cursor-crosshair"
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
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
              {/* Elements */}
              {project.elements
                .sort((a, b) => a.zIndex - b.zIndex)
                .map(el => (
                  <div
                    key={el.id}
                    className={`absolute cursor-move select-none transition-shadow ${
                      selectedElementId === el.id
                        ? 'ring-2 ring-primary rounded-sm shadow-lg'
                        : 'hover:ring-1 hover:ring-primary/50 rounded-sm'
                    }`}
                    style={{
                      left: `${el.position.leftPct}%`,
                      top: `${el.position.topPct}%`,
                      transform: `translate(-50%, -50%) rotate(${el.rotationDeg}deg) scale(${el.size.scale || 1})`,
                      zIndex: el.zIndex,
                      width: el.size.widthPct ? `${el.size.widthPct}%` : 'auto',
                    }}
                    onMouseDown={e => handleElementMouseDown(e, el)}
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
