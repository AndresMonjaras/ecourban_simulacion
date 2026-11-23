// Visor aislado del integrante v3: raiz propia, puerto propio, cache propia.
// Solo LEE modulos de ../../../../src (animacion, adaptador de rig, banca) y modelos de ../../../../public.
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const paquete = path.resolve(aqui, "../../../..");

export default defineConfig({
  root: aqui,
  publicDir: path.join(paquete, "public"),
  cacheDir: path.join(aqui, ".cache-vite"),
  server: { host: "127.0.0.1", port: 5181, strictPort: true, fs: { allow: [paquete] } },
});
