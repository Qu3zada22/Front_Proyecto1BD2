import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
      '/api': {
        target: 'http://localhost:3000/',
        changeOrigin: true,
      },
    },
  },

  // Vista previa del build de producción
  preview: {
    port: 4173,
  },

  // Optimización del bundle de producción
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            if (id.includes('radix') || id.includes('lucide') || id.includes('shadcn')) {
              return 'ui-vendor'
            }
            if (id.includes('tanstack') || id.includes('zustand') || id.includes('axios')) {
              return 'state-vendor'
            }
            return 'vendor'
          }
        },
      },
    },
  },
})
