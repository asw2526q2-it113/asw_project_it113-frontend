import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      util: 'util/',
      process: 'process/browser',
    },
  },

  define: {
    global: 'globalThis',
  },

  optimizeDeps: {
    include: ['qs'],
  },

  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/media': 'http://localhost:8000',
    }
  }
})