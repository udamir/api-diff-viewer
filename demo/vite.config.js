import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  root: path.resolve(__dirname),
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../demo-dist'),
    emptyOutDir: true,
  },
})
