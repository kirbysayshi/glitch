// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import alias from 'rollup-plugin-alias';

export default {
  input: 'client/index.js',
  output: {
    file: 'public/client.js',
    format: 'cjs'
  },
  plugins: [
    
    alias({
      'react': 'preact/dist/preact-compat.es.js',
      'react-dom': 'preact/dist/preact-compat.es.js',
    }),
    resolve({
      browser: true  
    }),
    
    babel({
      exclude: 'node_modules/**' // only transpile our source code
    }),
    commonjs(),
  ]
};