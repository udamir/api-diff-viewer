import babel from 'rollup-plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import external from 'rollup-plugin-peer-deps-external';
import { terser } from 'rollup-plugin-terser';
import postcss from 'rollup-plugin-postcss';
import typescript from '@rollup/plugin-typescript';

export default [
  {
    input: './src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
      },
      {
        file: 'dist/index.es.js',
        format: 'es',
        exports: 'named',
      }
    ],
    external: ['react', 'react-dom'],
    plugins: [
      postcss({
        plugins: [],
        minimize: true,
      }),
      typescript({
        exclude: ["src/stories"]
      }),
      babel({
        exclude: ['node_modules/**', "src/stories/**"],
        presets: ['@babel/preset-react']
      }),
      external(),
      resolve(),
      terser(),
    ]
  }
];