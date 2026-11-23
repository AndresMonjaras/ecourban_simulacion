import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/ecourban_simulacion/" : "/",
  cacheDir: ".cache/vite",
  server: { host: "0.0.0.0", port: 5177, strictPort: true },
});
