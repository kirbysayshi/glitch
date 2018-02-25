// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'client/index.js',
  output: {
    file: 'public/client.js',
    format: 'cjs'
  },
  plugins: [
    resolve({
      browser: true  
    }),
    
    babel({
      exclude: 'node_modules/**' // only transpile our source code
    }),
    commonjs(),
  ]
};