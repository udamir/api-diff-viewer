import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import comlink from 'vite-plugin-comlink';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        comlink(),
        react(),
        dts({
            insertTypesEntry: true,
        }),
    ],
    worker: {
        plugins: [
            comlink()
        ]
    },
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'ApiDiffViewer',
            formats: ['es', 'umd'],
            fileName: (format) => `api-diff-viewer.${format}.js`,
        },
        rollupOptions: {
            external: ['react', 'react-dom'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                },
            },
        },
    },
});