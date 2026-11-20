import { defineConfig } from "vite";

export default defineConfig({
  cacheDir: ".cache/vite",
  server: { host: "0.0.0.0", port: 5177, strictPort: true },
});
