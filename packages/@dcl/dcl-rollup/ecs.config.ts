import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { sys } from 'typescript'
import { terser } from 'rollup-plugin-terser'
import { RollupOptions } from 'rollup'
import { apiExtractorConfig } from './api-extractor'

const PROD = !!process.env.CI || process.env.NODE_ENV === 'production'

console.log(`production: ${PROD}`)
const packageJsonPath = sys.resolvePath('./package.json')
const packageJson = JSON.parse(sys.readFile(packageJsonPath)!)

console.assert(packageJson.name, 'package.json .name must be present')
console.assert(packageJson.main, 'package.json .main must be present')
console.assert(packageJson.typings, 'package.json .typings must be present')

export const basicRollupConfig: RollupOptions = {
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
    commonjs({
      exclude: 'node_modules',
      ignoreGlobal: true
    }),
    {
      name: 'api-extractor',
      writeBundle() {
        return apiExtractorConfig(packageJsonPath, !PROD)
      }
    }
  ]
}

const ecsConfig: RollupOptions = {
  ...basicRollupConfig,
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        declarationDir: '.'
      },
      tslib: require.resolve('tslib')
    }),
    ...basicRollupConfig.plugins!
  ]
}

export default ecsConfig
