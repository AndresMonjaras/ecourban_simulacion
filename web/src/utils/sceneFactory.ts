import { MODELOS_PERMITIDOS, type SceneObject, type TipoObjeto, type Vector3 } from "../types/scene.ts";
import { POSTURA_PERSONA_PARADA_DEFAULT } from "./humanPose.ts";

export function crearIdEscena(): string {
  return globalThis.crypto?.randomUUID?.() ?? `obj-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function crearObjetoEscena(tipo: TipoObjeto, id: string, ordinal: number, posicion: Vector3 = [0, 0, 0], componentes: string[] = []): SceneObject {
  const dimensiones: Record<TipoObjeto, Vector3> = {
    bench: [1500, 624.79, 850], person: [450, 350, 1750], weight: [200, 200, 200],
  };
  const nombres: Record<TipoObjeto, string> = {
    bench: `Banca PET ${String(ordinal).padStart(2, "0")}`,
    person: `Maniquí provisional ${String(ordinal).padStart(2, "0")}`,
    weight: `Bloque de 20 kg ${String(ordinal).padStart(2, "0")}`,
  };

  // La masa y las dimensiones describen el objeto; no activan cálculos físicos.
  return {
    id, name: nombres[tipo], type: tipo, modelId: MODELOS_PERMITIDOS[tipo],
    transform: { position: [...posicion], rotation: [0, 0, 0], scale: [1, 1, 1] },
    dimensionsMm: dimensiones[tipo],
    properties: tipo === "person" ? { massKg: 75, posture: { ...POSTURA_PERSONA_PARADA_DEFAULT } } : tipo === "weight" ? { massKg: 20 } : {},
    visible: true,
    metadata: { visualOnly: true, cadModelId: tipo === "bench" ? "banca-p002" : null, materialId: null,
      componentIds: [...componentes], surfaceIds: [], contacts: [], loads: [] },
  };
}
