import { Vector2 } from '../math/Vector2';

export type SceneConfig = Record<string, number>;
export type SceneState = Record<string, unknown>;

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  liftUp: boolean;
  liftDown: boolean;
  tiltUp: boolean;
  tiltDown: boolean;
  boost: boolean;
}

export interface SliderControl {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  description: string;
  choices?: Array<{
    label: string;
    value: number;
  }>;
}

export interface MetricCardData {
  label: string;
  value: string;
  helper: string;
}

export interface FormulaCardData {
  title: string;
  formula: string;
  explanation: string;
}

export interface ExerciseCardData {
  title: string;
  prompt: string;
  answer: string;
  steps?: string[];
}

export interface ReferenceImageData {
  src: string;
  title: string;
  description: string;
  href?: string;
}

export interface TutorialItem {
  title: string;
  body: string;
  bullets?: string[];
}

export interface ScenePanelData {
  metrics: MetricCardData[];
  formulas: FormulaCardData[];
  concept: TutorialItem[];
  studyNotes: TutorialItem[];
  loopSteps: TutorialItem[];
  exercises: ExerciseCardData[];
  intuition?: TutorialItem[];
  engineering?: TutorialItem[];
  pitfalls?: TutorialItem[];
  references?: ReferenceImageData[];
}

export interface SpriteAtlas {
  car?: HTMLImageElement;
  crate?: HTMLImageElement;
  bucket?: HTMLImageElement;
  pulley?: HTMLImageElement;
  plane?: HTMLImageElement;
  train?: HTMLImageElement;
  boat?: HTMLImageElement;
  package?: HTMLImageElement;
}

export interface RenderViewport {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  worldMinX: number;
  worldMinY: number;
  worldMaxX: number;
  worldMaxY: number;
  worldWidth: number;
  worldHeight: number;
}

export interface SceneCameraWindow {
  center: Vector2;
  width?: number;
  height?: number;
}

export interface SceneStepArgs {
  state: SceneState;
  config: SceneConfig;
  dt: number;
  input: InputState;
}

export interface SceneRenderArgs {
  ctx: CanvasRenderingContext2D;
  state: SceneState;
  config: SceneConfig;
  viewport: RenderViewport;
  sprites: SpriteAtlas;
}

export interface SceneDragHandle {
  id: string;
  position: Vector2;
  anchor?: Vector2;
  radius?: number;
  label: string;
  color?: string;
  style?: 'point' | 'vector';
}

export interface SceneDragArgs {
  handleId: string;
  worldPoint: Vector2;
  state: SceneState;
  config: SceneConfig;
  phase: 'start' | 'move' | 'end';
}

export interface SceneDragResult {
  configPatch?: Partial<SceneConfig>;
  pauseSimulation?: boolean;
}

export interface SceneDefinition {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  category: string;
  summary: string;
  worldWidth: number;
  worldHeight: number;
  keyboardHints: string[];
  defaults: SceneConfig;
  controls: SliderControl[];
  createState: (config: SceneConfig) => SceneState;
  step: (args: SceneStepArgs) => void;
  render: (args: SceneRenderArgs) => void;
  buildPanelData: (state: SceneState, config: SceneConfig) => ScenePanelData;
  getDragHandles?: (state: SceneState, config: SceneConfig) => SceneDragHandle[];
  onDrag?: (args: SceneDragArgs) => SceneDragResult | void;
  getCameraWindow?: (state: SceneState, config: SceneConfig) => SceneCameraWindow;
  resetOnConfigChange?: boolean;
  autoLoopDefault?: boolean;
}
