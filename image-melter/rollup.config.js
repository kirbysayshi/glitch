// rollup.config.js
import path from 'path';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import alias from 'rollup-plugin-alias';
import replace from 'rollup-plugin-replace';


export default {
  input: 'client/index.js',
  output: {
    file: 'public/client.js',
    format: 'cjs'
  },
  plugins: [
    
    replace({
      'process.env.NODE_ENV': process.env.NODE_ENV,
    }),
    
    alias({
      'react': path.resolve('./node_modules/preact-compat/dist/preact-compat.es.js'),
      'react-dom': path.resolve('./node_modules/preact-compat/dist/preact-compat.es.js'),
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