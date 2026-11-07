import test from "node:test";
import assert from "node:assert/strict";
import { createSceneHistory } from "../src/utils/sceneHistory.ts";
import { crearObjetoEscena } from "../src/utils/sceneFactory.ts";

test("deshacer restaura la última escena completa sin compartir sus transformaciones", () => {
  const history = createSceneHistory();
  const bench = crearObjetoEscena("bench", "bench-1", 1);
  history.save([bench]);
  bench.transform.position[0] = 1.25;

  assert.deepEqual(history.undo()?.[0].transform.position, [0, 0, 0]);
  assert.equal(history.undo(), null);
});
