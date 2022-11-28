import * as path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { copySync, mkdirSync, removeSync } from 'fs-extra'

import {
  commonChecks,
  ECS7_PATH,
  flow,
  JS_RUNTIME,
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
import { createProtoTypes } from './protocol-buffer-generation/generateProtocolTypes'
import { compileProtoApi } from './rpc-api-generation'
import { getSnippetsfile } from './utils/getFilePathsSync'

flow('build-all', () => {
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
  })

  flow('@dcl/ecs build', () => {
    itDeletesFolder('dist', ECS7_PATH)
    itExecutes('npm i --silent', ECS7_PATH)
    compileEcsComponents(
      `${ECS7_PATH}/src/components`,
      `${ECS7_PATH}/node_modules/@dcl/protocol/proto/decentraland/sdk/components`,
      `${ECS7_PATH}/node_modules/@dcl/protocol/proto/`
    )
    // copyFile(
    //   `${ECS7_PATH}/node_modules/@dcl/protocol/proto/decentraland/sdk/components`,
    //   `${SDK_PATH}/dist/ecs7/proto-definitions`
    // )
    itExecutes('npm run build --silent', ECS7_PATH)
    itExecutes('npm run build-bundle --silent', ECS7_PATH)
    it('check file exists', () => {
      if (!process.env.CI){
        copyFile(
          `${ECS7_PATH}/temp/ecs.api.md`,
          `${ECS7_PATH}/etc/ecs.api.md`
        )
        copyFile(
          `${ECS7_PATH}/temp/ecs.api.json`,
          `${ECS7_PATH}/etc/ecs.api.json`
        )
      }
      ensureFileExists('dist/index.d.ts', ECS7_PATH)
      ensureFileExists('dist/index.js', ECS7_PATH)
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

    itExecutes('npm run build --silent', SDK_PATH)
  })

  flow('@dcl/react-ecs', () => {
    itExecutes('npm i --silent', REACT_ECS)
    itExecutes(`npm install --silent ${ECS7_PATH}`, REACT_ECS)
    it('Copy proto files', async () => {
      const protoTypesPath = `${REACT_ECS}/src/generated`
      removeSync(protoTypesPath)
      mkdirSync(protoTypesPath)

      await createProtoTypes(
        `${ECS7_PATH}/node_modules/@dcl/protocol/proto/decentraland/sdk/components`,
        protoTypesPath,
        ['ui_transform.proto', 'ui_text.proto', 'ui_background.proto'],
        `${ECS7_PATH}/node_modules/@dcl/protocol/proto`
      )
    })
    itExecutes('npm run build --silent', REACT_ECS)
    it('check file exists', () => {
      ensureFileExists('dist/index.js', REACT_ECS)
      ensureFileExists('dist/index.d.ts', REACT_ECS)
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
      const playgroundDistPath = path.resolve(SDK_PATH, 'dist', 'playground')

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

        // Remove the unnecesary 'export {}', the only purposes of this is to compile all files in one step and test it
        const finalContent = fileContent.replace('export {}', '')

        const distPlaygroundPath = path.resolve(distSnippetsPath, fileName)
        writeFileSync(distPlaygroundPath, finalContent)
      }

      // // Create a JSON with the path of every snippet, this can be read by playground or CLI
      writeFileSync(
        path.resolve(distSnippetsPath, PLAYGORUND_INFO_JSON),
        JSON.stringify(snippetInfo)
      )
    })

    it.skip('playground copy minified files', async () => {
      const playgroundDistPath = path.resolve(SDK_PATH, 'dist', 'playground')

      // Copy minified ecs
      const filesToCopy = [
        {
          from: path.resolve(SDK_PATH, 'dist', 'ecs7', 'index.min.js'),
          fileName: 'index.min.js'
        },
        {
          from: path.resolve(SDK_PATH, 'types', 'ecs7', 'index.d.ts'),
          fileName: 'index.d.ts'
        },
        {
          from: path.resolve(JS_RUNTIME, 'apis.d.ts'),
          fileName: 'apis.d.ts'
        },
        {
          from: path.resolve(REACT_ECS, 'dist', 'index.min.js'),
          fileName: 'react-ecs.index.min.js'
        },
        {
          from: path.resolve(REACT_ECS, 'dist', 'index.d.ts'),
          fileName: 'react-ecs.index.d.ts'
        }
      ]
      const distPlaygroundSdkPath = path.resolve(playgroundDistPath, 'sdk')
      for (const file of filesToCopy) {
        const filePath = ensureFileExists(file.from)
        const destPath = path.resolve(distPlaygroundSdkPath, file.fileName)
        copyFile(filePath, destPath)
      }
    })
  })
})
