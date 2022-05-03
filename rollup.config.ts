import babel from 'rollup-plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import external from 'rollup-plugin-peer-deps-external';
import { terser } from 'rollup-plugin-terser';
import postcss from 'rollup-plugin-postcss';
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";

export default [
  {
    input: './src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      },
      {
        file: 'dist/index.es.js',
        format: 'es',
        exports: 'named',
        sourcemap: true
      }
    ],
    external: ['react', 'react-dom'],
    plugins: [
      commonjs(),
      postcss({
        plugins: [],
        minimize: true,
      }),
      typescript({ 
        useTsconfigDeclarationDir: true
      }),
      // babel({
      //   exclude: ['node_modules/**', "src/stories/**"],
      //   presets: ['@babel/preset-react']
      // }),
      external(),
      resolve(),
      terser(),
    ]
  }
];