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
  commonChecks
} from './common'
import { ensureFileExists, itExecutes, itDeletesFolder } from './helpers'

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
    itExecutes(`${TERSER} --mangle --comments some --source-map -o dist/amd.min.js dist/amd.js`, DECENTRALAND_AMD_PATH)

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
    itExecutes(`npm i --quiet`, ECS_PATH)
    itDeletesFolder('artifacts', ECS_PATH)
    const ROLLUP_ECS_CONFIG = resolve(ROLLUP_CONFIG_PATH, 'ecs.config.js')
    itExecutes(`${ROLLUP} -c ${ROLLUP_ECS_CONFIG}`, ECS_PATH)

    // install required dependencies
    itExecutes(`npm install --quiet ${BUILD_ECS_PATH}`, ECS_PATH)
    itExecutes(`npm install --quiet ${DECENTRALAND_AMD_PATH}`, ECS_PATH)
  })
})
