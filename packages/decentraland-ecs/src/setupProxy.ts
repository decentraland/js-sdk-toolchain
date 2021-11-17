import * as path from 'path'
import * as fs from 'fs'
import * as express from 'express'
import { createStaticRoutes, getDirectories } from './cli/setupUtils'
import { mockCatalyst } from './mock-catalyst'
import { mockPreviewWearables } from './cli/wearables'

const setupProxy = (dcl: any, app: express.Application) => {
  // first resolve all dependencies in the local current working directory
  // second try to resolve dependencies in decentraland-ecs folder
  /**
   * to test locally with linked packages:
   *
   * 1. go to explorer/kernel/static and run `npm link`
   * 2. in an empty folder create a test scene with `dcl init`
   * 3. in that folder run `npm install folder-to/decentraland-ecs`
   * 4. install whatever version of `@dcl/unity-renderer` you want to test
   * 5. link kernel using `npm link @dcll/kernel` this will use the folder from step 1
   */

  const ecsPath = path.dirname(
    require.resolve('decentraland-ecs/package.json', {
      paths: [dcl.getWorkingDir(), __dirname + '/../../', __dirname + '/../']
    })
  )
  const dclKernelPath = path.dirname(
    require.resolve('@dcl/kernel/package.json', { paths: [dcl.getWorkingDir(), ecsPath] })
  )
  const dclKernelDefaultProfilePath = path.resolve(dclKernelPath, 'default-profile')
  const dclKernelImagesDecentralandConnect = path.resolve(dclKernelPath, 'images', 'decentraland-connect')
  const dclKernelLoaderPath = path.resolve(dclKernelPath, 'loader')
  const dclUnityRenderer = path.dirname(
    require.resolve('@dcl/unity-renderer/package.json', { paths: [dcl.getWorkingDir(), ecsPath] })
  )

  const baseSceneFolders: string[] = [dcl.getWorkingDir()]
  // try {
  //   const scenesDir = getDirectories(path.resolve(dcl.getWorkingDir(), 'scenes'))
  //   for (const sceneDir of scenesDir) {
  //     const sceneJsonPath = path.resolve(dcl.getWorkingDir(), 'scenes', sceneDir, 'scene.json')
  //     if (fs.existsSync(sceneJsonPath)) {
  //       baseSceneFolders.push(path.dirname(sceneJsonPath))
  //     }
  //   }
  // } catch (err) {
  //   console.error(`Couldn't get the scenes in /scenes folder`, err)
  // }

  mockCatalyst(app, baseSceneFolders, dcl.getWorkingDir())

  const baseWearableFolders: string[] = [dcl.getWorkingDir()]
  // try {
  //   const wearablesDir = getDirectories(path.resolve(dcl.getWorkingDir(), 'wearables'))

  //   for (const wearableDir of wearablesDir) {
  //     const assetJsonPath = path.resolve(dcl.getWorkingDir(), 'wearables', wearableDir, 'asset.json')
  //     console.log({ assetJsonPath })
  //     if (fs.existsSync(assetJsonPath)) {
  //       baseWearableFolders.push(path.dirname(assetJsonPath))
  //     }
  //   }
  // } catch (err) {
  //   console.error(`Couldn't get the wearables in /wearables folder`, err)
  // }

  mockPreviewWearables(app, baseWearableFolders, dcl.getWorkingDir())

  const routes = [
    {
      route: '/',
      path: path.resolve(dclKernelPath, 'preview.html'),
      type: 'text/html'
    },
    {
      route: '/favicon.ico',
      path: path.resolve(dclKernelPath, 'favicon.ico'),
      type: 'text/html'
    },
    {
      route: '/@/artifacts/index.js',
      path: path.resolve(dclKernelPath, 'index.js'),
      type: 'text/javascript'
    }
  ]

  for (const route of routes) {
    app.get(route.route, async (req, res) => {
      res.setHeader('Content-Type', route.type)
      const contentFile = fs.readFileSync(route.path)
      res.send(contentFile)
    })
  }

  createStaticRoutes(app, '/images/decentraland-connect/*', dclKernelImagesDecentralandConnect)
  createStaticRoutes(app, '/@/artifacts/unity-renderer/*', dclUnityRenderer, (filePath) =>
    filePath.replace(/.br+$/, '')
  )
  createStaticRoutes(app, '/@/artifacts/loader/*', dclKernelLoaderPath)
  createStaticRoutes(app, '/default-profile/*', dclKernelDefaultProfilePath)
}

// @ts-ignore
export = setupProxy
