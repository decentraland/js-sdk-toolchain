import typescript from '@rollup/plugin-typescript'
import { sys } from 'typescript'
import { RollupOptions } from 'rollup'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import analyze from 'rollup-plugin-analyzer'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import * as path from 'path'

import { pathToFileURL } from 'url'

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

export function createSceneConfig(options: { PROD: boolean; single?: string }): RollupOptions {
  const sceneJsonPath = sys.resolvePath('./scene.json')
  const sceneJson = JSON.parse(sys.readFile(sceneJsonPath)!)

  console.assert(sceneJson.main, 'scene.json .main must be present')
  console.assert(sceneJson.runtimeVersion === '7', 'scene.json `"runtimeVersion": "7"` must be present')

  const out = !options.single ? sceneJson.main : options.single.replace(/\.ts$/, '.js')

  return {
    external: [/~system\//],
    input: options.single ?? 'src/index.ts',
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
          'process.env.NODE_ENV': JSON.stringify(options.PROD ? 'production' : 'development')
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
            file: out,
            format: 'commonjs',
            name: 'Scene',
            extend: true,
            sourcemap: 'hidden',
            compact: true,
            plugins: [terser({ format: { comments: false } })]
          }
        : {
            file: out,
            format: 'commonjs',
            name: 'Scene',
            extend: true,
            sourcemap: 'inline',
            sourcemapPathTransform: (distRelativeSourcePath: string) => {
              // Transform the relative-to-the-dist-folder source paths we get by default
              // into ones relative to the app root and prefixed with the package name
              // e.g. ../src/foo/bar.ts -> my-package-name/src/foo/bar.ts
              //
              // This fixes a monorepo issue where, when these source maps get bundled by a consumer's
              // webpack, everything mistakenly gets lumped under a single src directory
              // https://github.com/rollup/rollup/issues/2168#issuecomment-416628432
              //////////////////////////////////////////////////////////////////
              // source maps are generated with paths relative to the bundled file
              // for that reason we first get the dist folder in which the sourceMaps are
              const distFolder = path.dirname(path.resolve(sceneJson.main))
              // then we resolve the file, relative to distFolder
              const absoluteSourcePath = path.resolve(distFolder, distRelativeSourcePath)
              // then we convert it to a URL
              const url = pathToFileURL(absoluteSourcePath).toString()

              const fileRoot = pathToFileURL(process.cwd()).toString()

              if (url.startsWith(fileRoot)) {
                // if it is relative to the project, then we return a dcl://url
                const dclUrl = url.replace(fileRoot, 'dcl://')
                return dclUrl
              }

              const prefixedSourcePath = url.toString()
              return prefixedSourcePath
            },
            sourcemapBaseUrl: pathToFileURL(process.cwd()).toString()
          }
    ]
  }
}

export function createPlaygroundEcsConfig(_options: { PROD: boolean }): RollupOptions {
  const packageJsonPath = sys.resolvePath('./package.json')
  const packageJson = JSON.parse(sys.readFile(packageJsonPath)!)

  console.assert(packageJson.name, 'package.json .name must be present')
  console.assert(packageJson.main, 'package.json .main must be present')
  console.assert(packageJson.typings, 'package.json .typings must be present')

  const out = packageJson.main // .replace(/\.js$/, '.bundled.js')

  return {
    external: [/~system\//],
    input: 'src/index.ts',
    context: 'globalThis',
    output: [
      {
        file: out,
        format: 'iife',
        name: 'globalThis',
        extend: true,
        sourcemap: 'hidden'
      },
      {
        file: out.replace(/\.js$/, '.min.js'),
        format: 'commonjs',
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
