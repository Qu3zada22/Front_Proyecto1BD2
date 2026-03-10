import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Servidor de desarrollo
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000/",
        changeOrigin: true,
      },
    },
  },

  // Vista previa del build de producción
  preview: {
    port: 4173,
  },

  build: {
    sourcemap: false,
  },
});
