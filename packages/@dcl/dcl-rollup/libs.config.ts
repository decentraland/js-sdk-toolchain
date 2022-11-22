import typescript from '@rollup/plugin-typescript'
import { sys } from 'typescript'
import { terser } from 'rollup-plugin-terser'
import path from 'path'
import { RollupOptions } from 'rollup'

import { basicRollupConfig } from './ecs.config'
import replace from '@rollup/plugin-replace'

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
console.assert(packageJson.typings, 'package.json .typings must be present')

const tsconfigPath = sys.resolvePath('./tsconfig.json')
const tsconfig = JSON.parse(sys.readFile(tsconfigPath)!)
const excludeDist = path.dirname(packageJson.main)
tsconfig.exclude = tsconfig.exclude ?? [excludeDist]

sys.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2))

const config: RollupOptions = {
  ...basicRollupConfig,
  context: 'globalThis',
  plugins: [
    typescript({
      tsconfig: tsconfigPath,
      compilerOptions: {
        noEmitOnError: true,
        declaration: true,
        declarationDir: '.'
      }
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(
        PROD ? 'production' : 'development'
      )
    }),
    ...basicRollupConfig.plugins!
  ],
  output: [
    {
      file: packageJson.main,
      format: 'esm',
      sourcemap: 'inline'
    },
    {
      file: packageJson.main.replace(/\.js$/, '.min.js'),
      format: 'esm',
      compact: true,
      sourcemap: 'hidden',
      plugins: [terser({ format: { comments: false } })]
    }
  ]
}

export default config
