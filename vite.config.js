import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          physics: ['cannon-es'],
          audio: ['howler']
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true,
    host: true
  },
  optimizeDeps: {
    include: ['three', 'cannon-es', 'howler']
  }
});