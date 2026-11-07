import test from "node:test";
import assert from "node:assert/strict";
import { gradosARadianes, metrosAMilimetros, milimetrosAMetros, radianesAGrados } from "../src/utils/units.ts";

test("convierte milímetros a metros y viceversa", () => {
  assert.equal(milimetrosAMetros(250), 0.25);
  assert.equal(metrosAMilimetros(0.75), 750);
});

test("convierte grados a radianes y viceversa", () => {
  assert.equal(gradosARadianes(90), Math.PI / 2);
  assert.equal(radianesAGrados(Math.PI), 180);
});
