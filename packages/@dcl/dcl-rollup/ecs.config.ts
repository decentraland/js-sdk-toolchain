import resolve from '@rollup/plugin-node-resolve'
import { RollupOptions } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'
import { sys } from 'typescript'
import { apiExtractor } from './api-extractor'

const PROD = !!process.env.CI || process.env.NODE_ENV === 'production'

console.log(`production: ${PROD}`)
const packageJsonPath = sys.resolvePath('./package.json')
const packageJson = JSON.parse(sys.readFile(packageJsonPath)!)

console.assert(packageJson.name, 'package.json .name must be present')
console.assert(packageJson.main, 'package.json .main must be present')
console.assert(packageJson.typings, 'package.json .typings must be present')

const plugins = [
  typescript(),
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
  context: 'self',
  plugins,
  external: /@decentraland\//,
  output: [
    {
      file: packageJson.main,
      format: 'es',
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
      plugins: [terser({})]
    }
  ]
}

export default config
