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
