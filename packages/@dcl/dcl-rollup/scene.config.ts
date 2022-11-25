import typescript from '@rollup/plugin-typescript'
import { sys } from 'typescript'
import { RollupOptions } from 'rollup'
import terser from '@rollup/plugin-terser'
import analyze from 'rollup-plugin-analyzer'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

const PROD = !!process.env.CI || process.env.NODE_ENV === 'production'

console.log(`production: ${PROD}`)
const packageJsonPath = sys.resolvePath('./package.json')
const packageJson = JSON.parse(sys.readFile(packageJsonPath)!)
const sceneJsonPath = sys.resolvePath('./scene.json')
const sceneJson = JSON.parse(sys.readFile(sceneJsonPath)!)

console.assert(packageJson.name, 'package.json .name must be present')
console.assert(packageJson.main, 'package.json .main must be present')
console.assert(sceneJson.main, 'scene.json .main must be present')

const sceneConfig: RollupOptions = {
  external: [/~system\//],
  input: packageJson.main.replace(/\.js$/, '.ts'),
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        module: 'ESNext',
        noEmitOnError: true
      },
      typescript: require('typescript')
    }),
    resolve({
      preferBuiltins: false,
      browser: true
    }),
    commonjs({
      strictRequires: true
    }),
    PROD &&
      analyze({
        hideDeps: true,
        summaryOnly: true
      })
  ],
  output: [
    {
      file: sceneJson.main,
      format: 'umd',
      name: 'Scene',
      extend: true,
      sourcemap: 'inline'
    },
    {
      file: sceneJson.main.replace(/\.js$/, '.min.js'),
      format: 'umd',
      name: 'Scene',
      extend: true,
      sourcemap: 'hidden',
      compact: true,
      plugins: [terser({ format: { comments: false } })]
    }
  ],
  watch: !PROD ? { include: ['src/**'] } : undefined
}

export default sceneConfig
