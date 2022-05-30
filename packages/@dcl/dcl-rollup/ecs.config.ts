import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { apiExtractor } from 'rollup-plugin-api-extractor'
import { sys } from 'typescript'
import { terser } from 'rollup-plugin-terser'
import { RollupOptions } from 'rollup'

const PROD = !!process.env.CI || process.env.NODE_ENV === 'production'

console.log(`production: ${PROD}`)
const packageJsonPath = sys.resolvePath('./package.json')
const packageJson = JSON.parse(sys.readFile(packageJsonPath)!)

console.assert(packageJson.name, 'package.json .name must be present')
console.assert(packageJson.main, 'package.json .main must be present')
console.assert(packageJson.typings, 'package.json .typings must be present')

const rollupConfig: RollupOptions = {
  input: 'src/index.ts',
  context: 'globalThis',
  external: [/@decentraland\//],
  output: [
    {
      file: packageJson.main,
      format: 'iife',
      name: 'self',
      extend: true,
      sourcemap: 'inline'
    },
    {
      file: packageJson.main.replace(/\.js$/, '.min.js'),
      format: 'iife',
      name: 'self',
      extend: true,
      sourcemap: 'hidden',
      compact: true,
      plugins: [terser({ format: { comments: false } })]
    }
  ],
  plugins: [
    resolve({
      preferBuiltins: false,
      browser: true
    }),
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {}
    }),
    commonjs({
      exclude: 'node_modules',
      ignoreGlobal: true
    }),
    apiExtractor({
      configFile: './api-extractor.json',
      configuration: {
        projectFolder: '.',
        compiler: {
          tsconfigFilePath: '<projectFolder>/tsconfig.json'
        }
      },
      local: !PROD,
      cleanUpRollup: false,
      verbose: true
    })
  ]
}

export default rollupConfig
