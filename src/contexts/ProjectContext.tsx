import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { FloorplanProject, FloorplanElement, BackgroundImage } from '@/types/project';

const STORAGE_KEY = 'ha-floorplan-project';

const defaultProject: FloorplanProject = {
  name: 'My Floorplan',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  backgroundImage: null,
  elements: [],
};

type Action =
  | { type: 'SET_PROJECT'; project: FloorplanProject }
  | { type: 'SET_BACKGROUND'; bg: BackgroundImage }
  | { type: 'ADD_ELEMENT'; element: FloorplanElement }
  | { type: 'UPDATE_ELEMENT'; id: string; changes: Partial<FloorplanElement> }
  | { type: 'DELETE_ELEMENT'; id: string }
  | { type: 'DUPLICATE_ELEMENT'; id: string }
  | { type: 'REORDER_ELEMENT'; id: string; direction: 'forward' | 'backward' }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_ELEMENTS'; elements: FloorplanElement[] }
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
      return {
        project: action.project,
        history: [action.project],
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
