import test from "node:test";
import assert from "node:assert/strict";
import { normalizarPersonaSentadaAntigua, pararPersona, sentarPersona } from "../src/utils/humanPose.ts";
import { crearObjetoEscena } from "../src/utils/sceneFactory.ts";

test("la postura sentada deja pelvis y muslos sobre el asiento, con pies cerca del suelo", () => {
  const pose = sentarPersona(0.45, 0.45, [450, 350, 1750]);
  assert.ok(Math.abs(pose.angulos.cadera - 90) < 1e-9);
  assert.ok(Math.abs(pose.angulos.rodilla - 90) < 1e-9);
  assert.ok(pose.pelvis.center[2] - pose.pelvis.size[2] / 2 >= -0.01);
  assert.ok(pose.muslos.every((segment) => Math.abs(segment.start[2] - segment.end[2]) < 0.1));
  assert.ok(pose.muslos.every((segment) => Math.min(segment.start[2], segment.end[2]) - segment.radius >= -0.01));
  assert.ok(pose.pies.every((foot) => Math.abs(0.45 + foot.center[2] - foot.size[2] / 2) < 0.04));
});

test("el torso queda delante del respaldo de la banca", () => {
  const pose = sentarPersona(0.45, 0.45, [450, 350, 1750]);
  assert.ok(pose.torso.start[1] - pose.torso.radius > -0.225);
  assert.ok(pose.torso.end[1] - pose.torso.radius > -0.225);
});

test("las articulaciones modifican los segmentos en vez de rotar el maniquí completo", () => {
  const natural = sentarPersona(0.45, 0.45, [450, 350, 1750]);
  const flexionada = sentarPersona(0.45, 0.45, [450, 350, 1750], { hipFlexionDeg: 110, kneeFlexionDeg: 75 });
  assert.notDeepEqual(flexionada.muslos[0].end, natural.muslos[0].end);
  assert.notDeepEqual(flexionada.pantorrillas[0].end, natural.pantorrillas[0].end);
});

test("restaura la dimensión humana anterior al parche visual y conserva la masa", () => {
  const person = crearObjetoEscena("person", "person-1", 1, [0, 0, 0.45]);
  person.dimensionsMm = [450, 350, 950];
  person.properties.massKg = 82;
  const normalizada = normalizarPersonaSentadaAntigua(person);
  assert.deepEqual(normalizada.dimensionsMm, [450, 350, 1750]);
  assert.equal(normalizada.properties.massKg, 82);
});

test("la postura de pie conserva la anatomía articulada y apoya ambos pies en el suelo", () => {
  const pose = pararPersona([450, 350, 1750]);
  assert.equal(pose.angulos.cadera, 0);
  assert.equal(pose.angulos.rodilla, 0);
  assert.ok(pose.pies.every((foot) => Math.abs(foot.center[2] - foot.size[2] / 2) < 0.02));
  assert.ok(pose.torso.end[2] > 1.35);
});
