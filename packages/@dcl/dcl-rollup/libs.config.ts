import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript2'
import { sys } from 'typescript'
import { apiExtractor } from './api-extractor'
import { RollupOptions } from 'rollup'

const PROD = !!process.env.CI || process.env.NODE_ENV === 'production'

console.log(`production: ${PROD}`)
const packageJsonPath = sys.resolvePath('./package.json')
const packageJson = JSON.parse(sys.readFile(packageJsonPath)!)

console.assert(packageJson.name, 'package.json .name must be present')
console.assert(
  packageJson.decentralandLibrary,
  'package.json .decentralandLibrary must be an object'
)
console.assert(packageJson.main, 'package.json .main must be present')
console.assert(
  packageJson.typings || packageJson.types,
  'package.json .typings or .types must be present'
)

const plugins = [
  typescript({
    verbosity: 2,
    clean: true,
    tsconfigDefaults: {
      include: ['src'],
      compilerOptions: {
        module: 'ESNext',
        sourceMap: true,
        declaration: true
      }
      // extends: './node_modules/decentraland-ecs/types/tsconfig.json'
    },
    tsconfig: 'tsconfig.json',
    tsconfigOverride: {
      declaration: true,
      declarationMap: true,
      sourceMap: false,
      inlineSourceMap: true,
      inlineSources: true
    },
    typescript: require('typescript')
  }),
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs(),
  {
    name: 'api-extractor',
    writeBundle() {
      return apiExtractor(packageJsonPath, !PROD)
    }
  }
]

const config: RollupOptions = {
  input: './src/index.ts',
  context: 'globalThis',
  plugins,
  external: /@decentraland\//,
  output: [
    {
      file: packageJson.main,
      format: 'amd',
      name: packageJson.name,
      sourcemap: 'inline',
      amd: {
        id: packageJson.name
      }
    },
    {
      file: packageJson.main.replace(/\.js$/, '.min.js'),
      format: 'amd',
      name: packageJson.name,
      sourcemap: 'hidden',
      compact: true,
      amd: {
        id: packageJson.name
      },
      plugins: [terser({})]
    }
  ]
}
export default config
