import * as path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { copySync, mkdirSync, removeSync } from 'fs-extra'

import {
  BUILD_ECS_PATH,
  commonChecks,
  DECENTRALAND_AMD_PATH,
  ECS7_PATH,
  flow,
  JS_RUNTIME,
  REACT_ECS,
  ROLLUP_CONFIG_PATH,
  SDK_PATH,
  TERSER,
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

  flow('@dcl/build-ecs', () => {
    itExecutes(`npm i --quiet`, BUILD_ECS_PATH)
    itExecutes(`${TSC} -p tsconfig.json`, BUILD_ECS_PATH)
    itExecutes(`chmod +x index.js`, BUILD_ECS_PATH + '/dist')
    copyFile(
      BUILD_ECS_PATH + '/package.json',
      BUILD_ECS_PATH + '/dist/package.json'
    )

    it('check file exists', () => {
      ensureFileExists('index.js', BUILD_ECS_PATH + '/dist')
      ensureFileExists('package.json', BUILD_ECS_PATH + '/dist')
    })
  })

  flow('@dcl/amd', () => {
    itExecutes(`npm i --quiet`, DECENTRALAND_AMD_PATH)
    itDeletesFolder('dist', DECENTRALAND_AMD_PATH)
    itExecutes(`${TSC} -p tsconfig.json`, DECENTRALAND_AMD_PATH)
    itExecutes(
      `${TERSER} --mangle --comments some --source-map -o dist/amd.min.js dist/amd.js`,
      DECENTRALAND_AMD_PATH
    )

    it('check file exists', () => {
      ensureFileExists('dist/amd.js', DECENTRALAND_AMD_PATH)
      ensureFileExists('dist/amd.min.js', DECENTRALAND_AMD_PATH)
      ensureFileExists('dist/amd.min.js.map', DECENTRALAND_AMD_PATH)
    })
  })

  flow('@dcl/dcl-rollup', () => {
    itExecutes(`npm i --quiet`, ROLLUP_CONFIG_PATH)
    itExecutes(`${TSC} -p tsconfig.json`, ROLLUP_CONFIG_PATH)
    copyFile(
      ROLLUP_CONFIG_PATH + '/package.json',
      ROLLUP_CONFIG_PATH + '/dist/package.json'
    )
    it('check file exists', () => {
      ensureFileExists('dist/package.json', ROLLUP_CONFIG_PATH)
      ensureFileExists('dist/ecs.config.js', ROLLUP_CONFIG_PATH)
      ensureFileExists('dist/libs.config.js', ROLLUP_CONFIG_PATH)
    })
  })

  flow('@dcl/ecs7', () => {
    itExecutes('npm i --quiet', ECS7_PATH)
    compileEcsComponents(
      `${ECS7_PATH}/src/components`,
      `${ECS7_PATH}/node_modules/@dcl/protocol/proto/decentraland/sdk/components`,
      `${ECS7_PATH}/node_modules/@dcl/protocol/proto/`
    )
    itExecutes('npm run build', ECS7_PATH)
    copyFile(
      `${ECS7_PATH}/node_modules/@dcl/protocol/proto/decentraland/sdk/components`,
      `${ECS7_PATH}/dist/proto-definitions`
    )

    it('check file exists', () => {
      ensureFileExists('dist/index.js', ECS7_PATH)
      ensureFileExists('dist/index.min.js', ECS7_PATH)
      ensureFileExists('dist/proto-definitions', ECS7_PATH)
    })

    flow('@dcl/sdk', () => {
      itDeletesFolder('dist', SDK_PATH)
      itExecutes(`npm i --quiet`, SDK_PATH)

      itDeletesGlob('types/*.d.ts', SDK_PATH)

      // install required dependencies
      itExecutes(`npm install --quiet ${BUILD_ECS_PATH}`, SDK_PATH)
      itExecutes(`npm install --quiet ${DECENTRALAND_AMD_PATH}`, SDK_PATH)
      itExecutes(`npm install --quiet ${JS_RUNTIME}`, SDK_PATH)
    })

    it('copy ecs7 to @dcl/sdk pkg', () => {
      const filesToCopy = [
        'index.js',
        'index.d.ts',
        'index.min.js',
        'index.min.js.map',
        'proto-definitions'
      ]
      for (const file of filesToCopy) {
        const filePath = ensureFileExists(`dist/${file}`, ECS7_PATH)
        copyFile(filePath, `${SDK_PATH}/dist/ecs7/${file}`)

        if (file === 'index.d.ts') {
          const typePath = SDK_PATH + '/types/ecs7/index.d.ts'
          copyFile(filePath, typePath)
          fixTypes(typePath, { ignoreExportError: true })
        }
      }
    })
  })
  flow('@dcl/react-ecs', () => {
    itExecutes('npm i --quiet', REACT_ECS)
    itExecutes('npm run build', REACT_ECS)
    it('check file exists', () => {
      fixReactTypes()
      ensureFileExists('dist/index.js', REACT_ECS)
      ensureFileExists('dist/index.min.js', REACT_ECS)
      ensureFileExists('dist/index.d.ts', REACT_ECS)
    })
  })

  flow('rpc api generation', () => {
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

      expect(true).toBe(true)
    }, 60000)
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
      mkdirSync(playgroundDistPath)

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
        console.log({ distPlaygroundPath })
        writeFileSync(distPlaygroundPath, finalContent)
      }

      // // Create a JSON with the path of every snippet, this can be read by playground or CLI
      writeFileSync(
        path.resolve(distSnippetsPath, PLAYGORUND_INFO_JSON),
        JSON.stringify(snippetInfo)
      )
    })

    it('playground copy minified files', async () => {
      const playgroundDistPath = path.resolve(SDK_PATH, 'dist', 'playground')

      // Copy minified ecs
      const filesToCopy = [
        {
          from: path.resolve(DECENTRALAND_AMD_PATH, 'dist', 'amd.min.js'),
          fileName: 'amd.min.js'
        },
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

function fixReactTypes() {
  const typesPath = ensureFileExists(REACT_ECS + '/dist/index.d.ts')
  const content = readFileSync(typesPath).toString()

  writeFileSync(
    typesPath,
    content.replace('/// <reference types="@dcl/posix" />', '')
  )
}

function fixTypes(
  pathToDts: string,
  { ignoreExportError } = { ignoreExportError: false }
) {
  console.log({ boedo: 'fix types', pathToDts })
  let content = readFileSync(pathToDts).toString()

  content = content.replace(/^export declare/gm, 'declare')

  content = content.replace(/^export \{([\s\n\r]*)\}/gm, '')

  writeFileSync(pathToDts, content)

  if (!ignoreExportError && content.match(/\bexport\b/)) {
    throw new Error(`The file ${pathToDts} contains exports`)
  }

  if (content.match(/\bimport\b/)) {
    throw new Error(`The file ${pathToDts} contains imports`)
  }

  // TODO: uncomment this once @dcl/js-runtime is up and running
  // if (content.includes('/// <ref')) {
  //   throw new Error(`The file ${dtsFile} contains '/// <ref'`)
  // }
}
