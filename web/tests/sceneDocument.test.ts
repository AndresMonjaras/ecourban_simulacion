import test from "node:test";
import assert from "node:assert/strict";
import { parseSceneDocument, serializeSceneDocument } from "../src/utils/sceneDocument.ts";

const UNIDADES = { position: "m", rotation: "rad", mass: "kg", dimensions: "mm" };
const documento = (objects: unknown[], version = 1) => JSON.stringify({ version, units: UNIDADES, objects });

const banca = {
  id: "banca-uno", name: "Banca PET 01", type: "bench", modelId: "banca-p002",
  transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
  dimensionsMm: [1500, 624.79, 850], visible: true,
  properties: {}, metadata: { visualOnly: true, cadModelId: null, materialId: null, componentIds: [], surfaceIds: [], contacts: [], loads: [] },
};

test("serializa y recupera un documento versionado sin perder transformaciones", () => {
  const texto = serializeSceneDocument([banca]);
  const documento = parseSceneDocument(texto);
  assert.equal(documento.version, 1);
  assert.deepEqual(documento.objects[0], banca);
});

test("conserva las articulaciones de la persona y rechaza ángulos fuera de rango", () => {
  const persona = {
    ...banca,
    id: "persona-uno", name: "Maniquí 01", type: "person", modelId: "persona-maniqui-provisional",
    dimensionsMm: [450, 350, 1750], properties: { massKg: 75, posture: { hipFlexionDeg: 100, kneeFlexionDeg: 90, torsoLeanDeg: 5, shoulderFlexionDeg: 15, elbowFlexionDeg: 35 } },
  };
  const recuperado = parseSceneDocument(documento([persona])).objects[0];
  assert.deepEqual(recuperado.properties.posture, persona.properties.posture);
  const posturaInvalida = { ...persona, properties: { ...persona.properties, posture: { ...persona.properties.posture, kneeFlexionDeg: 500 } } };
  assert.throws(() => parseSceneDocument(documento([posturaInvalida])), /articulación/i);
});

test("rechaza referencias de modelo que no estén en la biblioteca permitida", () => {
  const objeto = { ...banca, modelId: "../../etc/passwd" };
  assert.throws(() => parseSceneDocument(documento([objeto])), /modelo/i);
});

test("rechaza IDs duplicados y valores no finitos antes de importar", () => {
  assert.throws(() => parseSceneDocument(documento([banca, banca])), /ID/i);
  const infinito = { ...banca, transform: { ...banca.transform, position: [1e999, 0, 0] } };
  assert.throws(() => parseSceneDocument(documento([infinito])), /finito/i);
});

test("rechaza versión y tamaño no soportados", () => {
  assert.throws(() => parseSceneDocument(documento([], 8)), /versión/i);
  assert.throws(() => parseSceneDocument(" ".repeat(5_000_001)), /grande/i);
});
