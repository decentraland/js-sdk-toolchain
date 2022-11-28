import typescript from '@rollup/plugin-typescript'
import { sys } from 'typescript'
import { RollupOptions } from 'rollup'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import analyze from 'rollup-plugin-analyzer'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export function createEcsConfig(_options: { PROD: boolean }): RollupOptions {
  const packageJsonPath = sys.resolvePath('./package.json')
  const packageJson = JSON.parse(sys.readFile(packageJsonPath)!)

  console.assert(packageJson.name, 'package.json .name must be present')
  console.assert(packageJson.main, 'package.json .main must be present')
  console.assert(packageJson.typings, 'package.json .typings must be present')

  const out = packageJson.main // .replace(/\.js$/, '.bundled.js')

  return {
    input: 'src/index.ts',
    context: 'self',
    output: [
      {
        file: out,
        format: 'esm',
        extend: true,
        sourcemap: 'inline'
      },
      {
        file: out.replace(/\.js$/, '.min.js'),
        format: 'esm',
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
      false &&
        analyze({
          hideDeps: true,
          summaryOnly: true
        }),
      typescript({
        tsconfig: './tsconfig.json',
        compilerOptions: {
          module: 'ESNext',
          noEmitOnError: true,
          declarationDir: '.'
        },
        typescript: require('typescript')
      })
    ]
  }
}

export function createSceneConfig(options: { PROD: boolean }): RollupOptions {
  const sceneJsonPath = sys.resolvePath('./scene.json')
  const sceneJson = JSON.parse(sys.readFile(sceneJsonPath)!)

  console.assert(sceneJson.main, 'scene.json .main must be present')
  console.assert(sceneJson.ecs7, 'scene.json `"ecs7": "true"` must be present')

  return {
    external: [/~system\//],
    input: 'src/index.ts',
    treeshake: {
      preset: 'smallest'
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        compilerOptions: {
          module: 'ESNext',
          // this is required to be false to enable watch mode in build-ecs
          noEmitOnError: false
        },
        typescript: require('typescript')
      }),
      replace({
        values: {
          document: 'undefined',
          window: 'undefined',
          DEBUG: options.PROD ? 'false' : 'true',
          'globalThis.DEBUG': options.PROD ? 'false' : 'true',
          'process.env.NODE_ENV': JSON.stringify(
            options.PROD ? 'production' : 'development'
          )
        },
        preventAssignment: true
      }),
      resolve({
        preferBuiltins: false,
        browser: true
      }),
      commonjs({
        strictRequires: true
      }),
      false &&
        options.PROD &&
        analyze({
          hideDeps: true,
          summaryOnly: true
        })
    ],
    output: [
      options.PROD
        ? {
            file: sceneJson.main,
            format: 'commonjs',
            name: 'Scene',
            extend: true,
            sourcemap: 'hidden',
            compact: true,
            plugins: [terser({ format: { comments: false } })]
          }
        : {
            file: sceneJson.main,
            format: 'commonjs',
            name: 'Scene',
            extend: true,
            sourcemap: 'inline'
          }
    ]
  }
}
