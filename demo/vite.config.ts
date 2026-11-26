import { defineConfig } from 'vite-plus'
import path from 'node:path'

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  base: './',
  build: {
    outDir: path.resolve(import.meta.dirname, '../demo-dist'),
    emptyOutDir: true,
  },
})
