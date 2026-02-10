import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({
    insertTypesEntry: true
  })],
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'ApiDiffViewer',
      formats: ['es', 'umd'],
      fileName: format => `api-diff-viewer.${format}.js`
    },
    rollupOptions: {
      output: {
        globals: {}
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production')
  }
});
