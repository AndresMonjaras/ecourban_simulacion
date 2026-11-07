import test from "node:test";
import assert from "node:assert/strict";
import { crearObjetoEscena } from "../src/utils/sceneFactory.ts";
import { findLandingPosition, getBenchDependents, removeObjectAndLandDependents } from "../src/utils/placement.ts";

test("un bloque aterriza sobre el asiento de la banca", () => {
  const bench = crearObjetoEscena("bench", "bench-1", 1);
  const block = crearObjetoEscena("weight", "weight-1", 1);
  assert.deepEqual(findLandingPosition(block, 0, 0, [bench]), [0, 0, 0.45]);
});

test("una banca nueva no puede apoyarse sobre otra banca", () => {
  const first = crearObjetoEscena("bench", "bench-1", 1);
  const second = crearObjetoEscena("bench", "bench-2", 2);
  assert.equal(findLandingPosition(second, 0, 0, [first]), null);
});

test("una persona puede apoyarse sentada sobre el asiento", () => {
  const bench = crearObjetoEscena("bench", "bench-1", 1);
  const person = crearObjetoEscena("person", "person-1", 1);
  person.dimensionsMm = [450, 350, 950];
  assert.deepEqual(findLandingPosition(person, 0, 0, [bench]), [0, 0, 0.45]);
});

test("al colocar sobre la banca exige que el cursor haya tocado el asiento", () => {
  const bench = crearObjetoEscena("bench", "bench-1", 1);
  const block = crearObjetoEscena("weight", "weight-1", 1);
  assert.equal(findLandingPosition(block, 0, 0, [bench], 0.8), null);
  assert.deepEqual(findLandingPosition(block, 0, 0, [bench], 0.45), [0, 0, 0.45]);
});

test("los bloques pueden apoyarse entre sí sin penetrarse", () => {
  const first = crearObjetoEscena("weight", "weight-1", 1);
  const second = crearObjetoEscena("weight", "weight-2", 2);
  assert.deepEqual(findLandingPosition(second, 0, 0, [first]), [0, 0, 0.2]);
});

test("un bloque puede apilarse sobre otro bloque colocado en la banca", () => {
  const bench = crearObjetoEscena("bench", "bench-1", 1);
  const first = crearObjetoEscena("weight", "weight-1", 1, [0, 0, 0.45]);
  const second = crearObjetoEscena("weight", "weight-2", 2);
  assert.deepEqual(findLandingPosition(second, 0, 0, [bench, first]), [0, 0, 0.65]);
});

test("el apoyo respeta la orientación de la banca", () => {
  const bench = crearObjetoEscena("bench", "bench-1", 1);
  bench.transform.rotation[2] = Math.PI / 2;
  const block = crearObjetoEscena("weight", "weight-1", 1);
  assert.deepEqual(findLandingPosition(block, 0, 0.55, [bench], 0.45), [0, 0.55, 0.45]);
  assert.deepEqual(findLandingPosition(block, 0.55, 0, [bench], 0.45), [0.55, 0, 0]);
});

test("detecta los objetos apoyados directa e indirectamente sobre la banca", () => {
  const bench = crearObjetoEscena("bench", "bench-1", 1);
  const block = crearObjetoEscena("weight", "weight-1", 1, [0, 0, 0.45]);
  const topBlock = crearObjetoEscena("weight", "weight-2", 2, [0, 0, 0.65]);

  assert.deepEqual(getBenchDependents(bench, [bench, block, topBlock]).map((item) => item.id), ["weight-1", "weight-2"]);
});

test("al quitar la banca apoya sus objetos en el suelo y cambia la persona a postura de pie", () => {
  const bench = crearObjetoEscena("bench", "bench-1", 1);
  const person = crearObjetoEscena("person", "person-1", 1, [0, 0, 0.45]);
  person.dimensionsMm = [450, 350, 1750];
  person.properties.posture = { hipFlexionDeg: 90, kneeFlexionDeg: 90, torsoLeanDeg: 5, shoulderFlexionDeg: 15, elbowFlexionDeg: 35 };
  const weight = crearObjetoEscena("weight", "weight-1", 1, [0.6, 0, 0.45]);

  const result = removeObjectAndLandDependents([bench, person, weight], bench.id);

  assert.deepEqual(result.map((item) => item.id), ["person-1", "weight-1"]);
  assert.equal(result.find((item) => item.id === "person-1")?.transform.position[2], 0);
  assert.equal(result.find((item) => item.id === "weight-1")?.transform.position[2], 0);
  assert.equal(result.find((item) => item.id === "person-1")?.properties.posture?.kneeFlexionDeg, 0);
});
