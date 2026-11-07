export type TipoObjeto = "bench" | "person" | "weight";
export type ModoTransformacion = "translate" | "rotate";
export type Vector3 = [number, number, number];
export type PosturaPersona = {
  hipFlexionDeg: number;
  kneeFlexionDeg: number;
  torsoLeanDeg: number;
  shoulderFlexionDeg: number;
  elbowFlexionDeg: number;
};

export const MODELOS_PERMITIDOS: Record<TipoObjeto, string> = {
  bench: "banca-p002",
  person: "persona-maniqui-provisional",
  weight: "bloque-200mm",
};

export type Transformacion = {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
};

export type MetadatosVisuales = {
  visualOnly: true;
  cadModelId: string | null;
  materialId: string | null;
  componentIds: string[];
  surfaceIds: string[];
  contacts: string[];
  loads: string[];
};

export type PropiedadesObjeto = { massKg?: number; posture?: PosturaPersona };

export type SceneObject = {
  id: string;
  name: string;
  type: TipoObjeto;
  modelId: string;
  transform: Transformacion;
  dimensionsMm: Vector3;
  properties: PropiedadesObjeto;
  visible: boolean;
  metadata: MetadatosVisuales;
};

export type SceneDocument = {
  version: 1;
  units: { position: "m"; rotation: "rad"; mass: "kg"; dimensions: "mm" };
  objects: SceneObject[];
};

export type MenuEscena = { objectId: string; x: number; y: number } | null;

export type SceneState = {
  objects: SceneObject[];
  selectedId: string | null;
  placementType: TipoObjeto | null;
  transformMode: ModoTransformacion;
  contextMenu: MenuEscena;
};

export type SceneAction =
  | { type: "add"; object: SceneObject }
  | { type: "select"; id: string | null }
  | { type: "setPlacement"; objectType: TipoObjeto | null }
  | { type: "setTransformMode"; mode: ModoTransformacion }
  | { type: "setContextMenu"; menu: MenuEscena }
  | { type: "updateTransform"; id: string; transform: Transformacion }
  | { type: "setVisibility"; id: string; visible: boolean }
  | { type: "toggleVisibility"; id: string }
  | { type: "updateObject"; id: string; changes: Partial<Pick<SceneObject, "name" | "properties" | "dimensionsMm">> }
  | { type: "duplicate"; id: string; newId: string }
  | { type: "remove"; id: string }
  | { type: "import"; objects: SceneObject[] }
  | { type: "reset" };
