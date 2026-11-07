import test from "node:test";
import assert from "node:assert/strict";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Scene } from "three";
import { findSceneObjectRoot } from "../src/utils/sceneObjectFocus.ts";

test("encuentra por ID un grupo transformado y conserva su caja global", () => {
  const scene = new Scene();
  const parent = new Group();
  parent.position.set(2, -1, 0.5);
  parent.rotation.z = Math.PI / 2;
  parent.scale.set(2, 2, 2);
  const object = new Group();
  object.userData.sceneObjectId = "peso-1";
  object.position.set(0.5, 0, 0.25);
  object.add(new Mesh(new BoxGeometry(1, 0.4, 0.2), new MeshBasicMaterial()));
  parent.add(object);
  scene.add(parent);
  scene.updateMatrixWorld(true);

  const found = findSceneObjectRoot(scene, "peso-1");

  assert.equal(found, object);
  assert.deepEqual(found?.getWorldPosition(found.position.clone()).toArray(), [2, 0, 1]);
});
