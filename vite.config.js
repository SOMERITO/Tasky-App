import { defineConfig } from "vite";

/**
 * TASKY · V1 · Vite
 *
 * base="./" permite que el build funcione tanto en:
 * - GitHub Pages: /Tasky-App/
 * - Median/WebView
 * - otros alojamientos estáticos
 *
 * Este archivo solo prepara el nuevo sistema de compilación.
 */
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false
  }
});
