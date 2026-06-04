import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['audible-shabby-wiring.ngrok-free.dev'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Enable source maps for production debugging
    sourcemap: true,
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          utils: ['date-fns', 'crypto-js'],
          pdf: ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
})
