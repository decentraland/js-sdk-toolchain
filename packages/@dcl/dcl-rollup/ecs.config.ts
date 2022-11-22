import resolve from '@rollup/plugin-node-resolve'
import analyze from 'rollup-plugin-analyzer'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { sys } from 'typescript'
import { terser } from 'rollup-plugin-terser'
import { RollupOptions } from 'rollup'
import { apiExtractorConfig } from './api-extractor'
import { apiExtractor } from 'rollup-plugin-api-extractor'

const PROD = !!process.env.CI || process.env.NODE_ENV === 'production'

console.log(`production: ${PROD}`)
const packageJsonPath = sys.resolvePath('./package.json')
const packageJson = JSON.parse(sys.readFile(packageJsonPath)!)

console.assert(packageJson.name, 'package.json .name must be present')
console.assert(packageJson.main, 'package.json .main must be present')
console.assert(packageJson.typings, 'package.json .typings must be present')

export const basicRollupConfig: RollupOptions = {
  input: 'src/index.ts',
  external: [/@decentraland\//, /~system\//],
  output: [
    {
      file: packageJson.main,
      format: 'esm',
      extend: true,
      sourcemap: 'inline'
    },
    {
      file: packageJson.main.replace(/\.js$/, '.min.js'),
      format: 'esm',
      extend: true,
      sourcemap: 'hidden',
      compact: true,
      plugins: [terser({ format: { comments: false } })]
    },
    {
      file: packageJson.main.replace(/\.js$/, '.iife.js'),
      format: 'iife',
      name: 'self',
      extend: true,
      sourcemap: 'inline'
    },
    {
      file: packageJson.main.replace(/\.js$/, '.min.iife.js'),
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
      strictRequires: true
    }),
    apiExtractor({
      configFile: './api-extractor.json',
      configuration: apiExtractorConfig(packageJsonPath),
      local: !PROD,
      cleanUpRollup: false
    }),
    analyze({
      hideDeps: true,
      summaryOnly: true
    })
  ]
}

const ecsConfig: RollupOptions = {
  ...basicRollupConfig,
  context: 'self',
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        module: 'ESNext',
        noEmitOnError: true,
        declarationDir: '.'
      },
      typescript: require('typescript')
    }),
    ...basicRollupConfig.plugins!
  ]
}

export default ecsConfig
