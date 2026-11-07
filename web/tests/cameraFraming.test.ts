import test from "node:test";
import assert from "node:assert/strict";
import { Box3, Vector3 } from "three";
import { calculateCameraFrame } from "../src/utils/cameraFraming.ts";

test("encuadra el centro y el tamaño global de la banca", () => {
  const box = new Box3(new Vector3(-0.75, -0.4, 0), new Vector3(0.75, 0.225, 0.85));
  const frame = calculateCameraFrame(box, 44, 1.15);

  frame.center.forEach((value, index) => assert.ok(Math.abs(value - [0, -0.0875, 0.425][index]) < 1e-12));
  assert.ok(frame.distance > 0.9 && frame.distance < 4);
  assert.ok(frame.distance > frame.radius);
});

test("aleja la cámara si el campo horizontal se estrecha", () => {
  const box = new Box3(new Vector3(-0.75, -0.4, 0), new Vector3(0.75, 0.225, 0.85));
  const frameAncho = calculateCameraFrame(box, 44, 1.8);
  const frameEstrecho = calculateCameraFrame(box, 44, 0.8);

  assert.ok(frameEstrecho.distance > frameAncho.distance);
});
