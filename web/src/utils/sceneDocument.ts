import { MODELOS_PERMITIDOS, type PosturaPersona, type SceneDocument, type SceneObject, type TipoObjeto, type Vector3 } from "../types/scene.ts";

export const VERSION_DOCUMENTO = 1;
export const TAMANO_MAXIMO_JSON = 5_000_000;
export const MAXIMO_OBJETOS = 100;

const UNIDADES = { position: "m", rotation: "rad", mass: "kg", dimensions: "mm" } as const;
const TIPOS = new Set<TipoObjeto>(["bench", "person", "weight"]);

export function serializeSceneDocument(objects: SceneObject[]): string {
  const documento: SceneDocument = { version: VERSION_DOCUMENTO, units: UNIDADES, objects };
  return JSON.stringify(documento, null, 2);
}

export function parseSceneDocument(text: string): SceneDocument {
  if (text.length > TAMANO_MAXIMO_JSON) {
    throw new Error("El archivo JSON es demasiado grande.");
  }

  let contenido: unknown;
  try {
    contenido = JSON.parse(text);
  } catch {
    throw new Error("El archivo no contiene JSON válido.");
  }

  if (!esRegistro(contenido) || contenido.version !== VERSION_DOCUMENTO) {
    throw new Error("La versión del escenario no está soportada.");
  }
  if (!esRegistro(contenido.units) || !tieneUnidadesValidas(contenido.units)) {
    throw new Error("Las unidades del escenario no coinciden con el formato esperado.");
  }
  if (!Array.isArray(contenido.objects) || contenido.objects.length > MAXIMO_OBJETOS) {
    throw new Error(`El escenario debe tener como máximo ${MAXIMO_OBJETOS} objetos.`);
  }

  const ids = new Set<string>();
  const objetos = contenido.objects.map((valor) => validarObjeto(valor, ids));
  return { version: VERSION_DOCUMENTO, units: UNIDADES, objects: objetos };
}

function validarObjeto(valor: unknown, ids: Set<string>): SceneObject {
  if (!esRegistro(valor)) throw new Error("Hay un objeto del escenario con formato inválido.");
  const { id, name, type, modelId, transform, dimensionsMm, properties, visible, metadata } = valor;
  if (typeof id !== "string" || id.trim() === "" || id.length > 120 || ids.has(id)) {
    throw new Error("Cada objeto debe tener un ID único y válido.");
  }
  ids.add(id);
  if (typeof name !== "string" || name.trim() === "" || name.length > 120) {
    throw new Error("El nombre de cada objeto debe tener entre 1 y 120 caracteres.");
  }
  if (typeof type !== "string" || !TIPOS.has(type as TipoObjeto)) {
    throw new Error("El tipo de objeto no está permitido.");
  }
  if (modelId !== MODELOS_PERMITIDOS[type as TipoObjeto]) {
    throw new Error("La referencia de modelo no está permitida para este tipo.");
  }
  if (!esRegistro(transform)) throw new Error("La transformación del objeto es inválida.");
  const posicion = validarVector(transform.position, "posición");
  const rotacion = validarVector(transform.rotation, "rotación");
  const escala = validarVector(transform.scale, "escala");
  if (escala.some((valor) => valor <= 0 || valor > 100)) {
    throw new Error("La escala debe ser positiva y no superar 100.");
  }
  if (posicion[2] < 0) throw new Error("La posición Z no puede quedar bajo el suelo.");
  const dimensiones = validarVector(dimensionsMm, "dimensiones");
  if (dimensiones.some((valor) => valor <= 0)) throw new Error("Las dimensiones deben ser positivas.");
  if (typeof visible !== "boolean" || !esRegistro(properties) || !esRegistro(metadata)) {
    throw new Error("Las propiedades del objeto son inválidas.");
  }
  const requiereMasa = type === "person" || type === "weight";
  const masa = properties.massKg;
  if (requiereMasa && (typeof masa !== "number" || !Number.isFinite(masa) || masa <= 0 || masa > 100_000)) {
    throw new Error("La masa debe ser un número positivo en kilogramos.");
  }
  const posture = type === "person" && properties.posture !== undefined ? validarPostura(properties.posture) : undefined;
  if (metadata.visualOnly !== true) {
    throw new Error("La ubicación sólo puede importarse como visual; no define contacto físico.");
  }
  const componentIds = validarListaTexto(metadata.componentIds, "componentIds");
  const surfaceIds = validarListaTexto(metadata.surfaceIds, "surfaceIds");
  const contacts = validarListaTexto(metadata.contacts, "contacts");
  const loads = validarListaTexto(metadata.loads, "loads");
  const cadModelId = metadata.cadModelId === null ? null : textoOpcional(metadata.cadModelId, "cadModelId");
  const materialId = metadata.materialId === null ? null : textoOpcional(metadata.materialId, "materialId");

  return {
    id, name, type: type as TipoObjeto, modelId,
    transform: { position: posicion, rotation: rotacion, scale: escala },
    dimensionsMm: dimensiones,
    properties: requiereMasa ? { massKg: masa as number, ...(posture ? { posture } : {}) } : {},
    visible,
    metadata: { visualOnly: true, cadModelId, materialId, componentIds, surfaceIds, contacts, loads },
  };
}

function validarPostura(value: unknown): PosturaPersona {
  if (!esRegistro(value)) throw new Error("La postura de la persona es inválida.");
  const rangos: Record<keyof PosturaPersona, [number, number]> = {
    hipFlexionDeg: [0, 130], kneeFlexionDeg: [0, 130], torsoLeanDeg: [-15, 30],
    shoulderFlexionDeg: [0, 80], elbowFlexionDeg: [0, 100],
  };
  const postura = {} as PosturaPersona;
  for (const [articulacion, [minimo, maximo]] of Object.entries(rangos) as [keyof PosturaPersona, [number, number]][]) {
    const angulo = value[articulacion];
    if (typeof angulo !== "number" || !Number.isFinite(angulo) || angulo < minimo || angulo > maximo) {
      throw new Error(`El ángulo de articulación ${articulacion} no es válido.`);
    }
    postura[articulacion] = angulo;
  }
  return postura;
}

function validarVector(valor: unknown, nombre: string): Vector3 {
  if (!Array.isArray(valor) || valor.length !== 3 || !valor.every((item) => typeof item === "number" && Number.isFinite(item))) {
    throw new Error(`El vector de ${nombre} debe tener tres números finitos.`);
  }
  return [valor[0], valor[1], valor[2]];
}

function validarListaTexto(valor: unknown, nombre: string): string[] {
  if (!Array.isArray(valor) || !valor.every((item) => typeof item === "string" && item.length <= 120)) {
    throw new Error(`La lista ${nombre} tiene un valor no válido.`);
  }
  return [...valor];
}

function textoOpcional(valor: unknown, nombre: string): string {
  if (typeof valor !== "string" || valor.length > 120) throw new Error(`El campo ${nombre} no es válido.`);
  return valor;
}

function esRegistro(valor: unknown): valor is Record<string, any> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function tieneUnidadesValidas(valor: Record<string, unknown>): boolean {
  return valor.position === UNIDADES.position && valor.rotation === UNIDADES.rotation &&
    valor.mass === UNIDADES.mass && valor.dimensions === UNIDADES.dimensions;
}
