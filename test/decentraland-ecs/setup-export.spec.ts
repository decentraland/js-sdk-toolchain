import * as path from 'path'
import * as fs from 'fs'
import { ensureFileExists } from '../../scripts/helpers'

const ecsLocation = path.resolve(__dirname, '../../packages/decentraland-ecs')

describe('decentraland-ecs: setupExport.js', () => {
  const setupExport = require(`${ecsLocation}/src/setupExport.js`)
  test(`export fake project`, async () => {
    const workDir = path.resolve(__dirname, 'simple-scene')
    const exportDir = path.resolve(workDir, 'export')
    const mappings: string[] = []
    const sceneJson = { display: { title: 'test' }, scene: { base: '-3,7' } }

    if (fs.existsSync(workDir)) {
      await fs.promises.rmdir(workDir, { recursive: true })
    }

    await fs.promises.mkdir(workDir)
    await fs.promises.mkdir(exportDir)

    await setupExport({
      workDir,
      exportDir,
      mappings,
      sceneJson
    })

    ensureFileExists('index.js', exportDir)
    ensureFileExists('index.html', exportDir)
    ensureFileExists('mappings', exportDir)
    ensureFileExists('unity-renderer/unity.wasm', exportDir)
    ensureFileExists('unity-renderer/unity.data', exportDir)
    ensureFileExists('unity-renderer/unity.framework.js', exportDir)
    ensureFileExists('unity-renderer/unity.loader.js', exportDir)
    ensureFileExists('unity-renderer/index.js', exportDir)
  }, 80000)
})
