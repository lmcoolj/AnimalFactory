import { defineConfig } from "vite";

// Plain Canvas + Vite + TypeScript. No framework — the UI is HTML/CSS,
// the conveyor and animals render on a <canvas>.
export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2020",
    outDir: "dist",
  },
});
