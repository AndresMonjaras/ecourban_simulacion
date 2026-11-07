import test from "node:test";
import assert from "node:assert/strict";
import { createInitialSceneState, sceneReducer } from "../src/stores/sceneReducer.ts";

const crearPeso = (id: string) => ({
  id, name: `Peso ${id}`, type: "weight" as const, modelId: "bloque-200mm",
  transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
  dimensionsMm: [200, 200, 200], visible: true,
  properties: { massKg: 20 }, metadata: { visualOnly: true, cadModelId: null, materialId: null, componentIds: [], surfaceIds: [], contacts: [], loads: [] },
});

test("agrega objetos, selecciona por ID y rechaza IDs repetidos", () => {
  const inicial = createInitialSceneState();
  const conPeso = sceneReducer(inicial, { type: "add", object: crearPeso("peso-a") });
  const seleccionado = sceneReducer(conPeso, { type: "select", id: "peso-a" });
  const repetido = sceneReducer(seleccionado, { type: "add", object: crearPeso("peso-a") });
  assert.equal(seleccionado.selectedId, "peso-a");
  assert.equal(repetido.objects.length, 1);
});

test("duplica con ID nuevo y borrar esa copia preserva otros objetos", () => {
  const uno = sceneReducer(createInitialSceneState(), { type: "add", object: crearPeso("peso-a") });
  const dos = sceneReducer(uno, { type: "add", object: crearPeso("peso-b") });
  const tres = sceneReducer(dos, { type: "duplicate", id: "peso-a", newId: "peso-c" });
  const borrado = sceneReducer(tres, { type: "remove", id: "peso-c" });
  assert.deepEqual(tres.objects.map((item) => item.id), ["peso-a", "peso-b", "peso-c"]);
  assert.deepEqual(borrado.objects.map((item) => item.id), ["peso-a", "peso-b"]);
  assert.equal(borrado.selectedId, null);
});

test("actualiza visibilidad sin alterar el resto de la escena", () => {
  const uno = sceneReducer(createInitialSceneState(), { type: "add", object: crearPeso("peso-a") });
  const dos = sceneReducer(uno, { type: "setVisibility", id: "peso-a", visible: false });
  assert.equal(dos.objects[0].visible, false);
  assert.equal(uno.objects[0].visible, true);
});

test("actualiza propiedades editables sin cambiar el ID ni otros objetos", () => {
  const uno = sceneReducer(createInitialSceneState(), { type: "add", object: crearPeso("peso-a") });
  const dos = sceneReducer(uno, { type: "updateObject", id: "peso-a", changes: { name: "Carga de prueba", dimensionsMm: [250, 200, 200] } });
  assert.equal(dos.objects[0].id, "peso-a");
  assert.equal(dos.objects[0].name, "Carga de prueba");
  assert.deepEqual(dos.objects[0].dimensionsMm, [250, 200, 200]);
  assert.equal(uno.objects[0].name, "Peso peso-a");
});

test("quitar la banca mantiene sus objetos apoyados y desciende los soportados al piso", () => {
  const bench = { ...crearPeso("banca"), type: "bench" as const, dimensionsMm: [1500, 624.79, 850] as [number, number, number] };
  const weight = { ...crearPeso("peso-sobre-banca"), transform: { position: [0, 0, 0.45] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] } };
  const uno = sceneReducer(createInitialSceneState(), { type: "add", object: bench });
  const dos = sceneReducer(uno, { type: "add", object: weight });

  const quitado = sceneReducer(dos, { type: "remove", id: "banca" });

  assert.deepEqual(quitado.objects.map((item) => item.id), ["peso-sobre-banca"]);
  assert.equal(quitado.objects[0].transform.position[2], 0);
});
