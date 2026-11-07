import type { SceneAction, SceneObject, SceneState } from "../types/scene.ts";
import { removeObjectAndLandDependents } from "../utils/placement.ts";

export function createInitialSceneState(): SceneState {
  return { objects: [], selectedId: null, placementType: null, transformMode: "translate", contextMenu: null };
}

export function sceneReducer(state: SceneState, action: SceneAction): SceneState {
  switch (action.type) {
    case "add":
      if (state.objects.some((object) => object.id === action.object.id)) return state;
      return { ...state, objects: [...state.objects, action.object], selectedId: action.object.id, placementType: null, contextMenu: null };
    case "select":
      return { ...state, selectedId: action.id && state.objects.some((object) => object.id === action.id) ? action.id : null, contextMenu: null };
    case "setPlacement":
      return { ...state, placementType: action.objectType, selectedId: action.objectType ? null : state.selectedId, contextMenu: null };
    case "setTransformMode":
      return { ...state, transformMode: action.mode };
    case "setContextMenu":
      return { ...state, contextMenu: action.menu, selectedId: action.menu?.objectId ?? state.selectedId };
    case "updateTransform":
      return { ...state, objects: state.objects.map((object) => object.id === action.id ? { ...object, transform: action.transform } : object) };
    case "setVisibility":
      return { ...state, objects: state.objects.map((object) => object.id === action.id ? { ...object, visible: action.visible } : object) };
    case "toggleVisibility":
      return { ...state, objects: state.objects.map((object) => object.id === action.id ? { ...object, visible: !object.visible } : object) };
    case "updateObject":
      return { ...state, objects: state.objects.map((object) => object.id === action.id ? { ...object, ...action.changes } : object) };
    case "duplicate": {
      const original = state.objects.find((object) => object.id === action.id);
      if (!original || state.objects.some((object) => object.id === action.newId)) return state;
      const copia: SceneObject = { ...original, id: action.newId, name: `${original.name} copia`, transform: { position: [...original.transform.position], rotation: [...original.transform.rotation], scale: [...original.transform.scale] } };
      return { ...state, objects: [...state.objects, copia], selectedId: copia.id, contextMenu: null };
    }
    case "remove": {
      const objects = removeObjectAndLandDependents(state.objects, action.id);
      return { ...state, objects, selectedId: state.selectedId === action.id ? null : state.selectedId, contextMenu: null };
    }
    case "import":
      return { ...state, objects: action.objects, selectedId: null, placementType: null, contextMenu: null };
    case "reset":
      return createInitialSceneState();
  }
}
