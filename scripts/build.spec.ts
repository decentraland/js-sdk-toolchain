import { readFileSync, writeFileSync } from 'fs'

import {
  flow,
  TSC,
  BUILD_ECS_PATH,
  DECENTRALAND_AMD_PATH,
  TERSER,
  ROLLUP_CONFIG_PATH,
  SDK_PATH,
  commonChecks,
  ECS7_PATH
} from './common'
import {
  ensureFileExists,
  itExecutes,
  itDeletesFolder,
  copyFile,
  itDeletesGlob
} from './helpers'

flow('build-all', () => {
  commonChecks()

  flow('@dcl/build-ecs', () => {
    itExecutes(`npm ci --quiet`, BUILD_ECS_PATH)
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
    itExecutes(`npm ci --quiet`, DECENTRALAND_AMD_PATH)
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
    itExecutes(`npm ci --quiet`, ROLLUP_CONFIG_PATH)
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

  flow('@dcl/sdk', () => {
    itDeletesFolder('dist', SDK_PATH)
    itExecutes(`npm i --quiet`, SDK_PATH)

    itDeletesGlob('types/dcl/*.d.ts', SDK_PATH)

    // install required dependencies
    itExecutes(`npm install --quiet ${BUILD_ECS_PATH}`, SDK_PATH)
    itExecutes(`npm install --quiet ${DECENTRALAND_AMD_PATH}`, SDK_PATH)

    itExecutes(`${TSC} src/setupProxy.ts src/setupExport.ts`, SDK_PATH)
  })

  flow('@dcl/ecs7', () => {
    itExecutes('make build', ECS7_PATH)

    it('check file exists', () => {
      ensureFileExists('dist/index.js', ECS7_PATH)
      ensureFileExists('dist/index.min.js', ECS7_PATH)
      ensureFileExists('dist/proto-definitions', ECS7_PATH)
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
          copyFile(filePath, SDK_PATH + '/types/ecs7/index.d.ts')
          fixTypes(typePath, { ignoreExportError: true })
        }
      }
    })
  })
})

function fixTypes(
  pathToDts: string,
  { ignoreExportError } = { ignoreExportError: false }
) {
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
