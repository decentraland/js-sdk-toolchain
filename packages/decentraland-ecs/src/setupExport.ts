import * as path from 'path'
import * as fs from 'fs'
import { entityV3FromFolder, copyDir, getSceneJson, ensureWriteFile, ensureCopyFile } from './setupUtils'
import standarWearableResponse from './defaultWearablesResponse'

const setupExport = async ({
  workDir,
  exportDir,
  mappings
}: {
  workDir: string
  exportDir: string
  mappings: any
  sceneJson: any
}): Promise<void> => {
  try {
    // 1) Path resolving
    const ecsPath = path.dirname(
      require.resolve('decentraland-ecs/package.json', {
        paths: [workDir, __dirname + '/../../', __dirname + '/../']
      })
    )
    const dclKernelPath = path.dirname(require.resolve('@dcl/kernel/package.json', { paths: [workDir, ecsPath] }))
    const dclKernelDefaultProfilePath = path.resolve(dclKernelPath, 'default-profile')
    const dclKernelLoaderPath = path.resolve(dclKernelPath, 'loader')
    const dclUnityRenderer = path.dirname(
      require.resolve('@dcl/unity-renderer/package.json', { paths: [workDir, ecsPath] })
    )
    const lambdasPath = path.resolve(exportDir, 'lambdas')
    const explorePath = path.resolve(lambdasPath, 'explore')
    const contractsPath = path.resolve(lambdasPath, 'contracts')
    const sceneContentPath = path.resolve(exportDir, 'content', 'entities')
    const contentsContentPath = path.resolve(exportDir, 'content', 'contents')
    const sceneJsonPath = path.resolve(workDir, './scene.json')

    // 2) Change HTML title name
    const defaultSceneJson = { display: { title: '' }, scene: { parcels: ['0,0'] } }
    const sceneJson = fs.existsSync(sceneJsonPath)
      ? JSON.parse(fs.readFileSync(sceneJsonPath).toString())
      : defaultSceneJson

    const content = await fs.promises.readFile(path.resolve(dclKernelPath, 'export.html'), 'utf-8')
    const finalContent = content.replace('{{ scene.display.title }}', sceneJson.display.title)

    // 3) Copy and write files
    await ensureWriteFile(
      path.resolve(explorePath, 'realms'),
      JSON.stringify([
        {
          serverName: 'localhost',
          url: `http://localhost`,
          layer: 'stub',
          usersCount: 0,
          maxUsers: 100,
          userParcels: []
        }
      ])
    )

    await ensureWriteFile(
      path.resolve(contractsPath, 'servers'),
      JSON.stringify([
        {
          address: `http://localhost`,
          owner: '0x0000000000000000000000000000000000000000',
          id: '0x0000000000000000000000000000000000000000000000000000000000000000'
        }
      ])
    )

    await ensureWriteFile(path.resolve(contractsPath, 'pois'), '')

    await ensureWriteFile(
      path.resolve(sceneContentPath, 'scene'),
      JSON.stringify(getSceneJson({ baseFolders: [workDir], pointers: sceneJson?.scene?.parcels || ['0,0'] }))
    )

    await ensureWriteFile(path.resolve(lambdasPath, 'profiles'), JSON.stringify([]))
    await ensureWriteFile(
      path.resolve(lambdasPath, 'collections', 'wearables'),
      JSON.stringify(standarWearableResponse)
    )

    const contentStatic = entityV3FromFolder({ folder: workDir, addOriginalPath: true })
    if (contentStatic?.content) {
      for (const $ of contentStatic?.content) {
        if ($ && $.original_path) {
          await ensureCopyFile(path.resolve(workDir, $.original_path), path.resolve(contentsContentPath, $.hash))
        }
      }
    }

    await Promise.all([
      // copy project
      ensureWriteFile(path.resolve(exportDir, 'index.html'), finalContent),
      ensureCopyFile(path.resolve(dclKernelPath, 'index.js'), path.resolve(exportDir, 'index.js')),
      ensureCopyFile(path.resolve(dclKernelPath, 'favicon.ico'), path.resolve(exportDir, 'favicon.ico')),

      // copy dependencies
      copyDir(dclUnityRenderer, path.resolve(exportDir, 'unity-renderer')),
      copyDir(dclKernelDefaultProfilePath, path.resolve(exportDir, 'default-profile')),
      copyDir(dclKernelLoaderPath, path.resolve(exportDir, 'loader'))
    ])
  } catch (err) {
    console.error('Export failed.', err)
    throw err
  }
  return
}

// @ts-ignore
export = setupExport
