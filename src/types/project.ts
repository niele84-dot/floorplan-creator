export type ElementType = 'state-icon' | 'state-label' | 'icon' | 'image' | 'action-button' | 'conditional';

export interface TapAction {
  action: 'toggle' | 'more-info' | 'navigate' | 'perform-action' | 'none' | 'call-service';
  navigation_path?: string;
  service?: string;
  service_data?: Record<string, unknown>;
}

export interface Condition {
  entity: string;
  state: string;
  state_not?: string;
}

export interface HAConfig {
  entity?: string;
  icon?: string;
  image?: string;
  title?: string;
  attribute?: string;
  prefix?: string;
  suffix?: string;
  tap_action?: TapAction;
  hold_action?: TapAction;
  double_tap_action?: TapAction;
  conditions?: Condition[];
}

export interface FloorplanElement {
  id: string;
  type: ElementType;
  position: { leftPct: number; topPct: number };
  size: { widthPct?: number; heightPct?: number; scale?: number; lockAspectRatio?: boolean };
  rotationDeg: number;
  zIndex: number;
  ha: HAConfig;
  assetRef?: string;
  iconSetId?: string;
  iconName?: string;
  label?: string;
}

export interface RoomPoint {
  leftPct: number;
  topPct: number;
}

export interface Room {
  id: string;
  name: string;
  polygon: RoomPoint[];
  linkedElementId: string | null;
  entity: string;
  overlayColor: string; // hex color for the glow
  zIndex: number;
}

export interface BackgroundImage {
  filename: string;
  originalWidth: number;
  originalHeight: number;
  dataUrl: string;
  scale?: number;       // 0.1–5, default 1
  rotationDeg?: number; // degrees, default 0
}

export interface FloorplanProject {
  name: string;
  createdAt: string;
  updatedAt: string;
  backgroundImage: BackgroundImage | null;
  elements: FloorplanElement[];
  rooms: Room[];
}
