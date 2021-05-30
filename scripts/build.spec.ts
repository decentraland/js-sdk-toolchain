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
import { ensureFileExists, executeStep, rmFolder } from './helpers'

flow('build-all', () => {
  commonChecks()

  flow('build-ecs', () => {
    executeStep(`npm ci --quiet`, BUILD_ECS_PATH)
    executeStep(`${TSC} -p tsconfig.json`, BUILD_ECS_PATH)
    ensureFileExists('index.js', BUILD_ECS_PATH)
    executeStep(`chmod +x index.js`, BUILD_ECS_PATH)
  })

  flow('@dcl/amd', () => {
    executeStep(`npm ci --quiet`, DECENTRALAND_AMD_PATH)
    rmFolder('dist', DECENTRALAND_AMD_PATH)
    executeStep(`${TSC} -p tsconfig.json`, DECENTRALAND_AMD_PATH)
    executeStep(`${TERSER} --mangle --comments some --source-map -o dist/amd.min.js dist/amd.js`, DECENTRALAND_AMD_PATH)
    ensureFileExists('dist/amd.js', DECENTRALAND_AMD_PATH)
    ensureFileExists('dist/amd.min.js', DECENTRALAND_AMD_PATH)
    ensureFileExists('dist/amd.min.js.map', DECENTRALAND_AMD_PATH)
  })

  flow('@dcl/dcl-rollup', () => {
    executeStep(`npm ci --quiet`, ROLLUP_CONFIG_PATH)
    executeStep(`${TSC} -p tsconfig.json`, ROLLUP_CONFIG_PATH)
    ensureFileExists('ecs.config.js', ROLLUP_CONFIG_PATH)
    ensureFileExists('libs.config.js', ROLLUP_CONFIG_PATH)
  })

  flow('decentraland-ecs', () => {
    executeStep(`npm ci  --quiet`, ECS_PATH)
    rmFolder('artifacts', ECS_PATH)
    const ROLLUP_ECS_CONFIG = resolve(ROLLUP_CONFIG_PATH, 'ecs.config.js')
    executeStep(`${ROLLUP} -c ${ROLLUP_ECS_CONFIG}`, ECS_PATH)

    // install required dependencies
    executeStep(`npm install --quiet ${BUILD_ECS_PATH}`, ECS_PATH)
    executeStep(`npm install --quiet ${DECENTRALAND_AMD_PATH}`, ECS_PATH)
  })
})
