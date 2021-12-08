import * as path from 'path'
import * as fs from 'fs'
import {
  entityV3FromFolder,
  copyDir,
  getSceneJson,
  ensureWriteFile,
  ensureCopyFile,
  downloadFile,
  shaHashMaker
} from './cli/setupUtils'

declare let URL: any

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
    const dclIgnorePath = path.resolve(workDir, '.dclignore')
    const dclKernelPath = path.dirname(
      require.resolve('@dcl/kernel/package.json', { paths: [workDir, ecsPath] })
    )
    const dclKernelDefaultProfilePath = path.resolve(
      dclKernelPath,
      'default-profile'
    )
    const dclKernelLoaderPath = path.resolve(dclKernelPath, 'loader')
    const dclKernelImagesDecentralandConnectPath = path.resolve(
      dclKernelPath,
      'images',
      'decentraland-connect'
    )
    const dclUnityRenderer = path.dirname(
      require.resolve('@dcl/unity-renderer/package.json', {
        paths: [workDir, ecsPath]
      })
    )
    const lambdasPath = path.resolve(exportDir, 'lambdas')
    const explorePath = path.resolve(lambdasPath, 'explore')
    const contractsPath = path.resolve(lambdasPath, 'contracts')
    const sceneContentPath = path.resolve(exportDir, 'content', 'entities')
    const contentsContentPath = path.resolve(exportDir, 'content', 'contents')
    const sceneJsonPath = path.resolve(workDir, './scene.json')

    // 2) Change HTML title name
    const defaultSceneJson = {
      display: { title: '' },
      scene: { parcels: ['0,0'] }
    }
    const sceneJson = fs.existsSync(sceneJsonPath)
      ? JSON.parse(fs.readFileSync(sceneJsonPath).toString())
      : defaultSceneJson

    const content = await fs.promises.readFile(
      path.resolve(dclKernelPath, 'export.html'),
      'utf-8'
    )
    const finalContent = content
      .replace('{{ scene.display.title }}', sceneJson.display.title)
      .replace('{{ scene.scene.base }}', sceneJson.scene.base)

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
      JSON.stringify(
        getSceneJson({
          baseFolders: [workDir],
          pointers: sceneJson?.scene?.parcels || ['0,0'],
          customHashMaker: shaHashMaker,
          catalystRootFolder: workDir
        })
      )
    )

    await ensureWriteFile(
      path.resolve(lambdasPath, 'profiles'),
      JSON.stringify([])
    )

    let ignoreFileContent = ''
    if (fs.existsSync(dclIgnorePath)) {
      ignoreFileContent = fs.readFileSync(
        path.resolve(workDir, '.dclignore'),
        'utf-8'
      )
    }
    const contentStatic = entityV3FromFolder({
      folder: workDir,
      addOriginalPath: true,
      ignorePattern: ignoreFileContent,
      customHashMaker: shaHashMaker,
      catalystRootFolder: workDir
    })
    if (contentStatic?.content) {
      for (const $ of contentStatic?.content) {
        if ($ && $.original_path) {
          await ensureCopyFile(
            path.resolve(workDir, $.original_path),
            path.resolve(contentsContentPath, $.hash)
          )
        }
      }
    }

    await Promise.all([
      // copy project
      ensureWriteFile(path.resolve(exportDir, 'index.html'), finalContent),
      ensureWriteFile(
        path.resolve(exportDir, 'mappings'),
        JSON.stringify(mappings)
      ),
      ensureCopyFile(
        path.resolve(dclKernelPath, 'index.js'),
        path.resolve(exportDir, 'index.js')
      ),
      ensureCopyFile(
        path.resolve(dclKernelPath, 'favicon.ico'),
        path.resolve(exportDir, 'favicon.ico')
      ),

      // copy dependencies
      copyDir(dclUnityRenderer, path.resolve(exportDir, 'unity-renderer')),
      copyDir(
        dclKernelDefaultProfilePath,
        path.resolve(exportDir, 'default-profile')
      ),
      copyDir(dclKernelLoaderPath, path.resolve(exportDir, 'loader'))
    ])

    if (fs.existsSync(dclKernelImagesDecentralandConnectPath)) {
      await copyDir(
        dclKernelImagesDecentralandConnectPath,
        path.resolve(exportDir, 'images', 'decentraland-connect')
      )
    }

    const copyBrVersion = [
      'unity.wasm',
      'unity.data',
      'unity.framework.js',
      'unity.data'
    ]
    for (const fileName of copyBrVersion) {
      if (fs.existsSync(path.resolve(exportDir, 'unity-renderer', fileName))) {
        await ensureCopyFile(
          path.resolve(exportDir, 'unity-renderer', fileName),
          path.resolve(exportDir, 'unity-renderer', `${fileName}.br`)
        )
      }
    }

    await copyWearables({ exportDir })
    await copyContentStatus({ exportDir })
    await ensureWriteFile(
      path.resolve(exportDir, 'content', 'available-content'),
      '[{"cid":"0","available":false}]'
    )
  } catch (err) {
    console.error('Export failed.', err)
    throw err
  }
  return
}

const copyWearables = async ({ exportDir }: { exportDir: string }) => {
  const filesToDownload = new Set<string>()
  const wearableResponsePath = path.resolve(
    exportDir,
    'lambdas',
    'collections',
    'wearables'
  )
  const baseAvatarUrl =
    'https://peer-lb.decentraland.org/lambdas/collections/wearables?collectionId=urn:decentraland:off-chain:base-avatars'

  await ensureWriteFile(wearableResponsePath, '')

  try {
    await downloadFile(baseAvatarUrl, wearableResponsePath)
  } catch (err) {
    console.error(
      `Couldn't fetch base avatars to serve statically. Please verify your internet connection`
    )
    throw err
  }

  const response = JSON.parse(fs.readFileSync(wearableResponsePath).toString())

  for (const w_i in response.wearables) {
    // download wearable.thumbnail and copy and replace
    filesToDownload.add(`${response.wearables[w_i].thumbnail || ''}`)
    response.wearables[w_i].thumbnail =
      '.' + new URL(response.wearables[w_i].thumbnail).pathname

    for (const r_j in response.wearables[w_i].data.representations) {
      // download each contents representation mainFile,
      for (const c_k in response.wearables[w_i].data.representations[r_j]
        .contents) {
        const url =
          response.wearables[w_i].data.representations[r_j].contents[c_k].url
        filesToDownload.add(`${url || ''}`)
        response.wearables[w_i].data.representations[r_j].contents[c_k].url =
          '.' + new URL(url).pathname
      }
    }
  }

  const promises = []

  for (const fileUrl of Array.from(filesToDownload)) {
    const url = new URL(fileUrl)
    const filePath = path.resolve(exportDir, url.pathname.substr(1))
    await ensureWriteFile(filePath, '')
    promises.push(downloadFile(url.toString(), filePath))
  }

  try {
    await Promise.all(promises)
  } catch (err) {
    console.error(
      `Couldn't fetch base avatars to serve statically. Please verify your internet connection`
    )
    throw err
  }
  await ensureWriteFile(wearableResponsePath, JSON.stringify(response, null, 2))
}

const copyContentStatus = async ({ exportDir }: { exportDir: string }) => {
  const exportContentStatusPath = path.resolve(exportDir, 'content', 'status')
  const contentStatusUrl = 'https://peer-lb.decentraland.org/content/status'
  await ensureWriteFile(
    exportContentStatusPath,
    '{"name":"","version":"v3","currentTime":1631814332458,"lastImmutableTime":0,"historySize":1173579,"synchronizationStatus":{"otherServers":[{"address":"https://peer-ec1.decentraland.org/content","connectionState":"Connected","lastDeploymentTimestamp":1631814242286},{"address":"https://interconnected.online/content","connectionState":"Connected","lastDeploymentTimestamp":1631814258357},{"address":"https://peer.uadevops.com/content","connectionState":"Connected","lastDeploymentTimestamp":1631814281355},{"address":"https://peer-eu1.decentraland.org/content","connectionState":"Connected","lastDeploymentTimestamp":1631814265837},{"address":"https://peer.decentral.games/content","connectionState":"Connected","lastDeploymentTimestamp":1631814282692},{"address":"https://peer.dclnodes.io/content","connectionState":"Connected","lastDeploymentTimestamp":1631814241548},{"address":"https://peer.kyllian.me/content","connectionState":"Connected","lastDeploymentTimestamp":1631814268853},{"address":"https://peer.melonwave.com/content","connectionState":"Connected","lastDeploymentTimestamp":1631814264357},{"address":"https://peer-wc1.decentraland.org/content","connectionState":"Connected","lastDeploymentTimestamp":1631814245952},{"address":"https://peer-ap1.decentraland.org/content","connectionState":"Connected","lastDeploymentTimestamp":1631814275187}],"lastSyncWithDAO":1631814298354,"synchronizationState":"Synced","lastSyncWithOtherServers":1631814290132},"commitHash":"5cbd6479c8df19e91559e79128c1457fc54d9478","catalystVersion":"2.1.0","ethNetwork":"mainnet"}'
  )
  try {
    await downloadFile(contentStatusUrl, exportContentStatusPath)
  } catch (err) {
    console.warn(
      `Content status couldn't be fetched, instead it will be mocked preload status. Please verify your internet connection.`
    )
  }
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export = setupExport
