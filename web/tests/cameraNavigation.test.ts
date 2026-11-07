import test from "node:test";
import assert from "node:assert/strict";
import { getWASDAxes } from "../src/utils/cameraNavigation.ts";

test("las combinaciones diagonales WASD se normalizan", () => {
  const diagonal = Math.SQRT1_2;
  const casiIgual = (actual: number[], esperado: number[]) => actual.forEach((valor, index) => assert.ok(Math.abs(valor - esperado[index]) < 1e-12));
  casiIgual(getWASDAxes(new Set(["a", "w"])), [diagonal, -diagonal]);
  casiIgual(getWASDAxes(new Set(["a", "s"])), [-diagonal, -diagonal]);
  casiIgual(getWASDAxes(new Set(["d", "w"])), [diagonal, diagonal]);
});

test("mantener dos teclas opuestas cancela el desplazamiento", () => {
  assert.deepEqual(getWASDAxes(new Set(["w", "s"])), [0, 0]);
  assert.deepEqual(getWASDAxes(new Set(["a", "d"])), [0, 0]);
});
