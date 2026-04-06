import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { FloorplanProject, FloorplanElement, BackgroundImage, Room } from '@/types/project';

const STORAGE_KEY = 'ha-floorplan-project';

const defaultProject: FloorplanProject = {
  name: 'My Floorplan',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  backgroundImage: null,
  elements: [],
  rooms: [],
};

type Action =
  | { type: 'SET_PROJECT'; project: FloorplanProject }
  | { type: 'SET_BACKGROUND'; bg: BackgroundImage | null }
  | { type: 'ADD_ELEMENT'; element: FloorplanElement }
  | { type: 'UPDATE_ELEMENT'; id: string; changes: Partial<FloorplanElement> }
  | { type: 'DELETE_ELEMENT'; id: string }
  | { type: 'DUPLICATE_ELEMENT'; id: string }
  | { type: 'REORDER_ELEMENT'; id: string; direction: 'forward' | 'backward' }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_ELEMENTS'; elements: FloorplanElement[] }
  | { type: 'ADD_ROOM'; room: Room }
  | { type: 'UPDATE_ROOM'; id: string; changes: Partial<Room> }
  | { type: 'DELETE_ROOM'; id: string }
  | { type: 'SCALE_ALL_POSITIONS'; factor: number }
  | { type: 'UNDO' }
  | { type: 'REDO' };

interface State {
  project: FloorplanProject;
  history: FloorplanProject[];
  historyIndex: number;
  selectedElementId: string | null;
}

function projectReducer(state: State, action: Action): State {
  const pushHistory = (newProject: FloorplanProject): State => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newProject);
    if (newHistory.length > 50) newHistory.shift();
    return {
      ...state,
      project: { ...newProject, updatedAt: new Date().toISOString() },
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  };

  switch (action.type) {
    case 'SET_PROJECT': {
      const proj = { ...action.project, rooms: action.project.rooms || [] };
      return {
        project: proj,
        history: [proj],
        historyIndex: 0,
        selectedElementId: null,
      };
    }
    case 'SET_BACKGROUND':
      return pushHistory({ ...state.project, backgroundImage: action.bg });
    case 'ADD_ELEMENT':
      return pushHistory({
        ...state.project,
        elements: [...state.project.elements, action.element],
      });
    case 'UPDATE_ELEMENT':
      return pushHistory({
        ...state.project,
        elements: state.project.elements.map(el =>
          el.id === action.id ? { ...el, ...action.changes } : el
        ),
      });
    case 'DELETE_ELEMENT':
      return {
        ...pushHistory({
          ...state.project,
          elements: state.project.elements.filter(el => el.id !== action.id),
          // Unlink rooms that referenced this element
          rooms: (state.project.rooms || []).map(r =>
            r.linkedElementId === action.id ? { ...r, linkedElementId: null } : r
          ),
        }),
        selectedElementId: state.selectedElementId === action.id ? null : state.selectedElementId,
      };
    case 'DUPLICATE_ELEMENT': {
      const src = state.project.elements.find(el => el.id === action.id);
      if (!src) return state;
      const dup: FloorplanElement = {
        ...JSON.parse(JSON.stringify(src)),
        id: crypto.randomUUID(),
        position: { leftPct: src.position.leftPct + 2, topPct: src.position.topPct + 2 },
      };
      return pushHistory({ ...state.project, elements: [...state.project.elements, dup] });
    }
    case 'REORDER_ELEMENT': {
      const elements = [...state.project.elements];
      const idx = elements.findIndex(el => el.id === action.id);
      if (idx === -1) return state;
      if (action.direction === 'forward') {
        elements[idx] = { ...elements[idx], zIndex: elements[idx].zIndex + 1 };
      } else {
        elements[idx] = { ...elements[idx], zIndex: Math.max(0, elements[idx].zIndex - 1) };
      }
      return pushHistory({ ...state.project, elements });
    }
    case 'SET_NAME':
      return pushHistory({ ...state.project, name: action.name });
    case 'SET_ELEMENTS':
      return pushHistory({ ...state.project, elements: action.elements });
    case 'ADD_ROOM':
      return pushHistory({
        ...state.project,
        rooms: [...(state.project.rooms || []), action.room],
      });
    case 'UPDATE_ROOM':
      return pushHistory({
        ...state.project,
        rooms: (state.project.rooms || []).map(r =>
          r.id === action.id ? { ...r, ...action.changes } : r
        ),
      });
    case 'DELETE_ROOM':
      return pushHistory({
        ...state.project,
        rooms: (state.project.rooms || []).filter(r => r.id !== action.id),
      });
    case 'SCALE_ALL_POSITIONS': {
      const f = action.factor;
      // Scale element positions proportionally from center (50%, 50%), keep icon sizes unchanged
      const scaledElements = state.project.elements.map(el => ({
        ...el,
        position: {
          leftPct: Math.max(0, Math.min(100, 50 + (el.position.leftPct - 50) * f)),
          topPct: Math.max(0, Math.min(100, 50 + (el.position.topPct - 50) * f)),
        },
      }));
      // Also scale room polygons
      const scaledRooms = (state.project.rooms || []).map(r => ({
        ...r,
        polygon: r.polygon.map(p => ({
          leftPct: Math.max(0, Math.min(100, 50 + (p.leftPct - 50) * f)),
          topPct: Math.max(0, Math.min(100, 50 + (p.topPct - 50) * f)),
        })),
      }));
      return pushHistory({ ...state.project, elements: scaledElements, rooms: scaledRooms });
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIdx = state.historyIndex - 1;
      return { ...state, project: state.history[newIdx], historyIndex: newIdx };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIdx = state.historyIndex + 1;
      return { ...state, project: state.history[newIdx], historyIndex: newIdx };
    }
    default:
      return state;
  }
}

interface ProjectContextType {
  project: FloorplanProject;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  dispatch: React.Dispatch<Action>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const loadInitial = (): State => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const project = JSON.parse(saved) as FloorplanProject;
        project.rooms = project.rooms || [];
        return { project, history: [project], historyIndex: 0, selectedElementId: null };
      }
    } catch { /* ignore */ }
    return { project: defaultProject, history: [defaultProject], historyIndex: 0, selectedElementId: null };
  };

  const [state, dispatch] = useReducer(projectReducer, undefined, loadInitial);
  const selectedRef = useRef<string | null>(null);
  const [selectedElementId, setSelectedElementId] = React.useState<string | null>(null);

  selectedRef.current = selectedElementId;

  // Autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project));
      } catch { /* quota exceeded */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [state.project]);

  return (
    <ProjectContext.Provider value={{
      project: state.project,
      selectedElementId,
      setSelectedElementId,
      canUndo: state.historyIndex > 0,
      canRedo: state.historyIndex < state.history.length - 1,
      dispatch,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
