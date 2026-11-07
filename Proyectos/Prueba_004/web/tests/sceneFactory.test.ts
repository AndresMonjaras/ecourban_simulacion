import test from "node:test";
import assert from "node:assert/strict";
import { crearObjetoEscena, crearIdEscena } from "../src/utils/sceneFactory.ts";

test("crea los tres tipos con modelos, dimensiones y masas iniciales correctas", () => {
  const banca = crearObjetoEscena("bench", "banca-01", 1, [0, 0, 0], ["asiento_01"]);
  const persona = crearObjetoEscena("person", "persona-01", 1);
  const peso = crearObjetoEscena("weight", "peso-01", 1);
  assert.equal(banca.modelId, "banca-p002");
  assert.deepEqual(banca.metadata.componentIds, ["asiento_01"]);
  assert.equal(persona.properties.massKg, 75);
  assert.equal(peso.properties.massKg, 20);
  assert.deepEqual(peso.dimensionsMm, [200, 200, 200]);
});

test("genera IDs únicos y con formato UUID", () => {
  const uno = crearIdEscena();
  const dos = crearIdEscena();
  assert.match(uno, /^[0-9a-f-]{36}$/i);
  assert.notEqual(uno, dos);
});
