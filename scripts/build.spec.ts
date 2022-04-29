import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

import {
  flow,
  TSC,
  BUILD_ECS_PATH,
  DECENTRALAND_AMD_PATH,
  TERSER,
  ROLLUP_CONFIG_PATH,
  ECS_PATH,
  ROLLUP,
  commonChecks,
  LEGACY_ECS_PATH
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

  flow('build-ecs', () => {
    itExecutes(`npm ci --quiet`, BUILD_ECS_PATH)
    itExecutes(`${TSC} -p tsconfig.json`, BUILD_ECS_PATH)
    itExecutes(`chmod +x index.js`, BUILD_ECS_PATH)

    it('check file exists', () => {
      ensureFileExists('index.js', BUILD_ECS_PATH)
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
    it('check file exists', () => {
      ensureFileExists('ecs.config.js', ROLLUP_CONFIG_PATH)
      ensureFileExists('libs.config.js', ROLLUP_CONFIG_PATH)
    })
  })

  flow('decentraland-ecs', () => {
    itDeletesFolder('dist', ECS_PATH)
    itExecutes(`npm i --quiet`, ECS_PATH)

    itDeletesGlob('types/dcl/*.d.ts', ECS_PATH)

    const ROLLUP_ECS_CONFIG = resolve(ROLLUP_CONFIG_PATH, 'ecs.config.js')
    itExecutes(`${ROLLUP} -c ${ROLLUP_ECS_CONFIG}`, LEGACY_ECS_PATH)

    // install required dependencies
    itExecutes(`npm install --quiet ${BUILD_ECS_PATH}`, ECS_PATH)
    itExecutes(`npm install --quiet ${DECENTRALAND_AMD_PATH}`, ECS_PATH)

    itExecutes(`${TSC} src/setupProxy.ts`, ECS_PATH)
    copyLegacyEcs()
    fixTypes()
  })

  flow('legacy-ecs', () => {
    // This legacy-ecs flow should be always after decentrland-ecs.
    // Why? First we bundle legacy-ecs as an iife file (rollout), and move it to decentraland-ecs.
    // And then we build legacy-ecs with TS and publish it to npm so we can use it like a normal module.

    itExecutes(`npm ci --quiet`, LEGACY_ECS_PATH)
    itDeletesFolder('dist', LEGACY_ECS_PATH)
    itExecutes(`${TSC} -p tsconfig.json`, LEGACY_ECS_PATH)
  })
})

function copyLegacyEcs() {
  it('copy legacy ecs iife to decentraland-ecs', () => {
    const filesToCopy = ['index.js', 'index.min.js', 'index.min.js.map']
    for (const file of filesToCopy) {
      const filePath = ensureFileExists(`dist/${file}`, LEGACY_ECS_PATH)
      copyFile(filePath, `${ECS_PATH}/dist/src/${file}`)
    }
  })
}

function fixTypes() {
  it('fix ecs types', () => {
    const original = ensureFileExists('dist/index.d.ts', LEGACY_ECS_PATH)

    copyFile(original, ECS_PATH + '/dist/index.d.ts')
    copyFile(original, ECS_PATH + '/types/dcl/index.d.ts')

    const dtsFile = ensureFileExists('types/dcl/index.d.ts', ECS_PATH)
    {
      let content = readFileSync(dtsFile).toString()

      content = content.replace(/^export declare/gm, 'declare')

      content = content.replace(/^export \{([\s\n\r]*)\}/gm, '')

      writeFileSync(dtsFile, content)

      if (content.match(/\bexport\b/)) {
        throw new Error(`The file ${dtsFile} contains exports`)
      }

      if (content.match(/\bimport\b/)) {
        throw new Error(`The file ${dtsFile} contains imports`)
      }

      // TODO: uncomment this once @dcl/js-runtime is up and running
      // if (content.includes('/// <ref')) {
      //   throw new Error(`The file ${dtsFile} contains '/// <ref'`)
      // }
    }
  })
}
