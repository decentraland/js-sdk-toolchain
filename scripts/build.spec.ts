import * as path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { copySync, existsSync, mkdirSync, removeSync } from 'fs-extra'
import { summary } from '@actions/core'

import {
  commonChecks,
  CRDT_PATH,
  ECS7_PATH,
  flow,
  JS_RUNTIME,
  PLAYGROUND_ASSETS_PATH,
  REACT_ECS,
  ROLLUP_CONFIG_PATH,
  SDK_PATH,
  TSC
} from './common'
import {
  copyFile,
  ensureFileExists,
  ensureFileExistsSilent,
  itDeletesFolder,
  itDeletesGlob,
  itExecutes,
  runCommand
} from './helpers'
import { compileEcsComponents } from './protocol-buffer-generation'
import { compileProtoApi } from './rpc-api-generation'
import { getSnippetsfile } from './utils/getFilePathsSync'

flow('build-all', () => {
  afterAll(async () => {
    if (process.env.GITHUB_STEP_SUMMARY) {
      await summary.write()
    }
  })

  commonChecks()

  flow('@dcl/js-runtime', () => {
    it('compile protos', async () => {
      const rpcProtoPath = path.resolve(
        __dirname,
        'rpc-api-generation',
        'src',
        'proto'
      )
      removeSync(rpcProtoPath)
      mkdirSync(rpcProtoPath)
      writeFileSync(path.resolve(rpcProtoPath, 'README.md'), '# Generated code')

      await runCommand(`make compile_apis`, path.resolve(__dirname, '..'))
      await compileProtoApi()

      copySync(
        path.resolve(__dirname, 'rpc-api-generation/src/modules', 'index.d.ts'),
        path.resolve(JS_RUNTIME, 'apis.d.ts')
      )
    }, 60000)

    it('check file exists', () => {
      ensureFileExists('apis.d.ts', JS_RUNTIME)
      ensureFileExists('index.d.ts', JS_RUNTIME)
    })
  })

  flow('@dcl/dcl-rollup', () => {
    itDeletesFolder('dist', ROLLUP_CONFIG_PATH)
    itExecutes(`npm i --silent`, ROLLUP_CONFIG_PATH)
    itExecutes(`${TSC} -p tsconfig.json`, ROLLUP_CONFIG_PATH)
    it('check file exists', () => {
      ensureFileExists('index.js', ROLLUP_CONFIG_PATH)
      ensureFileExists('index.d.ts', ROLLUP_CONFIG_PATH)
    })
    itExecutes(`chmod +x index.js`, ROLLUP_CONFIG_PATH)
  })

  flow('@dcl/crdt build', () => {
    itDeletesFolder('dist', CRDT_PATH)
    itExecutes('npm i --silent', CRDT_PATH)
    itExecutes('npm run build --silent', CRDT_PATH)
    it('check file exists', () => {
      ensureFileExists('dist/index.d.ts', CRDT_PATH)
      ensureFileExists('dist/index.js', CRDT_PATH)
      ensureFileExists('dist/types.d.ts', CRDT_PATH)
      ensureFileExists('dist/types.js', CRDT_PATH)
    })
  })
  flow('@dcl/ecs build', () => {
    itDeletesFolder('dist', ECS7_PATH)
    itExecutes('npm i --silent', ECS7_PATH)
    itExecutes(`npm install --silent ${CRDT_PATH}`, ECS7_PATH)
    compileEcsComponents(
      `${ECS7_PATH}/src/components`,
      `${ECS7_PATH}/node_modules/@dcl/protocol/proto/decentraland/sdk/components`,
      `${ECS7_PATH}/node_modules/@dcl/protocol/proto/`
    )
    itExecutes('npm run build --silent', ECS7_PATH)
    it('check file exists', () => {
      ensureFileExists('dist/index.d.ts', ECS7_PATH)
      ensureFileExists('dist/index.js', ECS7_PATH)
    })
  })

  flow('@dcl/react-ecs', () => {
    itExecutes('npm i --silent', REACT_ECS)
    itExecutes(`npm install --silent ${ECS7_PATH}`, REACT_ECS)
    itExecutes('npm run build --silent', REACT_ECS)
    it('check file exists', () => {
      ensureFileExists('dist/index.js', REACT_ECS)
      ensureFileExists('dist/index.d.ts', REACT_ECS)
    })
  })

  flow('@dcl/sdk build', () => {
    itDeletesFolder('dist', SDK_PATH)
    itExecutes(`npm i --silent`, SDK_PATH)

    itDeletesGlob('types/*.d.ts', SDK_PATH)

    // install required dependencies
    itExecutes(`npm install --silent ${ROLLUP_CONFIG_PATH}`, SDK_PATH)
    itExecutes(`npm install --silent ${JS_RUNTIME}`, SDK_PATH)
    itExecutes(`npm install --silent ${ECS7_PATH}`, SDK_PATH)
    itExecutes(`npm install --silent ${REACT_ECS}`, SDK_PATH)

    itExecutes('npm run build --silent', SDK_PATH)
    itExecutes('npm run build:cli --silent', SDK_PATH)

    it('check files exists', () => {
      ensureFileExists('index.js', SDK_PATH)
      ensureFileExists('index.d.ts', SDK_PATH)
      ensureFileExists('math.js', SDK_PATH)
      ensureFileExists('math.d.ts', SDK_PATH)
      ensureFileExists('ecs.js', SDK_PATH)
      ensureFileExists('ecs.d.ts', SDK_PATH)
      ensureFileExists('react-ecs.js', SDK_PATH)
      ensureFileExists('react-ecs.d.ts', SDK_PATH)
      ensureFileExists('cli/index.js', SDK_PATH)
      ensureFileExists('cli/index.d.ts', SDK_PATH)
    })

    itExecutes(`chmod +x cli/index.js`, SDK_PATH)
  })

  flow('@dcl/playground-assets build', () => {
    itDeletesFolder('dist', PLAYGROUND_ASSETS_PATH)
    itDeletesFolder('bin', PLAYGROUND_ASSETS_PATH)

    itExecutes(`npm i --silent`, PLAYGROUND_ASSETS_PATH)

    // install required dependencies
    itExecutes(`npm install --silent ${SDK_PATH}`, PLAYGROUND_ASSETS_PATH)

    if (process.env.GITHUB_STEP_SUMMARY) {
      itExecutes('npm run build --silent', PLAYGROUND_ASSETS_PATH)
      it('set the output as summary', async () => {
        const file = path.resolve(
          PLAYGROUND_ASSETS_PATH,
          'etc/playground-assets.api.md'
        )
        if (!existsSync(file)) throw new Error(`${file} doesn't exist`)
        summary.addRaw(readFileSync(file).toString())
      })
    } else {
      itDeletesGlob('etc/*', PLAYGROUND_ASSETS_PATH)
      itExecutes('npm run build-local --silent', PLAYGROUND_ASSETS_PATH)
    }

    it('check no ae-forgotten-export are present in bundle file', async () => {
      const file = path.resolve(
        PLAYGROUND_ASSETS_PATH,
        'etc/playground-assets.api.md'
      )
      if (!existsSync(file)) throw new Error(`${file} doesn't exist`)
      const content = readFileSync(file).toString()
      const occurences = content.match(/^.*ae-forgotten-export.*/gim)
      expect(occurences ?? []).toEqual([])
    })

    it('check no conflict in types are present in generated bundle', async () => {
      const file = path.resolve(
        PLAYGROUND_ASSETS_PATH,
        'etc/playground-assets.api.md'
      )
      if (!existsSync(file)) throw new Error(`${file} doesn't exist`)
      const content = readFileSync(file).toString()
      const occurences = content.match(/.*_2\b/gim)
      expect(occurences ?? []).toEqual([])
    })
  })

  flow('playground copy files', () => {
    it('playground copy snippets', async () => {
      const PLAYGORUND_INFO_JSON = 'info.json'
      const snippetsPath = path.resolve(
        process.cwd(),
        'test',
        'ecs',
        'snippets'
      )
      const playgroundDistPath = path.resolve(
        PLAYGROUND_ASSETS_PATH,
        'dist',
        'playground'
      )

      // Clean last build
      removeSync(playgroundDistPath)
      mkdirSync(playgroundDistPath, { recursive: true })

      // Copy snippets
      const snippetsFiles = getSnippetsfile(snippetsPath)

      const distSnippetsPath = path.resolve(playgroundDistPath, 'snippets')
      mkdirSync(distSnippetsPath)

      const snippetInfo = []
      for (const snippet of snippetsFiles) {
        const filePath =
          ensureFileExistsSilent(snippet + '/index.ts', snippetsPath) ||
          ensureFileExists(snippet + '/index.tsx', snippetsPath)!
        const infoJson = ensureFileExists(snippet + '/info.json', snippetsPath)

        if (!filePath || !infoJson) continue
        const extension = filePath.endsWith('tsx') ? '.tsx' : '.ts'
        const fileName = snippet + extension
        const fileContent = readFileSync(filePath).toString()
        const fileInfo = JSON.parse(readFileSync(infoJson).toString())

        const info = {
          name: fileInfo.name,
          category: fileInfo.category,
          path: fileName
        }

        snippetInfo.push(info)

        const distPlaygroundPath = path.resolve(distSnippetsPath, fileName)
        writeFileSync(distPlaygroundPath, fileContent)
      }

      // // Create a JSON with the path of every snippet, this can be read by playground or CLI
      writeFileSync(
        path.resolve(distSnippetsPath, PLAYGORUND_INFO_JSON),
        JSON.stringify(snippetInfo)
      )
    })

    it('playground copy minified files', async () => {
      const playgroundDistPath = path.resolve(
        PLAYGROUND_ASSETS_PATH,
        'dist',
        'playground'
      )

      // Copy minified ecs
      const filesToCopy = [
        {
          from: path.resolve(JS_RUNTIME, 'apis.d.ts'),
          fileName: 'apis.d.ts'
        },
        {
          from: path.resolve(SDK_PATH, 'package.json'),
          fileName: 'dcl-sdk.package.json'
        }
      ]
      const distPlaygroundSdkPath = path.resolve(playgroundDistPath, 'sdk')
      for (const file of filesToCopy) {
        const filePath = ensureFileExists(file.from)
        const destPath = path.resolve(distPlaygroundSdkPath, file.fileName)
        ensureFileExists(filePath)
        copyFile(filePath, destPath)
        ensureFileExists(destPath)
      }
    })
  })
})
