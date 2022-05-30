import typescript from '@rollup/plugin-typescript'
import { sys } from 'typescript'
import { terser } from 'rollup-plugin-terser'
import { basicRollupConfig } from './ecs.config'
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
console.assert(packageJson.typings, 'package.json .typings must be present')

const tsconfigPath = sys.resolvePath('./package.json')

const config: RollupOptions = {
  ...basicRollupConfig,
  plugins: [
    typescript({
      tsconfig: tsconfigPath,
      compilerOptions: {
        declaration: true,
        declarationDir: 'types'
      }
    }),
    ...basicRollupConfig.plugins!
  ],
  output: [
    {
      file: packageJson.main,
      format: 'amd',
      name: 'self',
      extend: true,
      sourcemap: 'inline'
    },
    {
      file: packageJson.main.replace(/\.js$/, '.min.js'),
      format: 'amd',
      name: 'self',
      extend: true,
      sourcemap: 'hidden',
      compact: true,
      plugins: [terser({ format: { comments: false } })]
    }
  ]
}

export default config
