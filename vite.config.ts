import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        // Serve the SPA shell for client-side routes when offline.
        navigateFallback: "index.html",
      },
    }),
  ],
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "functions/lib/**"],
    globals: true,
    setupFiles: "./src/test-setup.ts",
  },
});
