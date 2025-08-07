import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({
    // Ensure React is available globally
    jsxRuntime: 'classic'
  })],
  // Remove base path for Vercel deployment (use '/' for root deployment)
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Ensure React and React-DOM are bundled together properly
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor'
          }
          if (id.includes('ethers')) {
            return 'ethers'
          }
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  define: {
    // Ensure React is available globally in production
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'ethers']
  }
})
