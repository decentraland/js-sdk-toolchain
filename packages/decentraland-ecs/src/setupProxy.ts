import * as path from 'path'
import * as fs from 'fs'
import * as express from 'express'
import { createStaticRoutes } from './cli/setupUtils'
import { mockCatalyst } from './cli/mock-catalyst'
import { mockPreviewWearables } from './cli/wearables'
import { sdk } from '@dcl/schemas'

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
    require.resolve('@dcl/kernel/package.json', {
      paths: [dcl.getWorkingDir(), ecsPath]
    })
  )
  const dclKernelDefaultProfilePath = path.resolve(
    dclKernelPath,
    'default-profile'
  )
  const dclKernelImagesDecentralandConnect = path.resolve(
    dclKernelPath,
    'images',
    'decentraland-connect'
  )
  const dclKernelLoaderPath = path.resolve(dclKernelPath, 'loader')
  const dclUnityRenderer = path.dirname(
    require.resolve('@dcl/unity-renderer/package.json', {
      paths: [dcl.getWorkingDir(), ecsPath]
    })
  )

  let baseSceneFolders: string[] = [dcl.getWorkingDir()]
  let baseWearableFolders: string[] = [dcl.getWorkingDir()]

  if (dcl.workspace) {
    const projects = dcl.workspace.getAllProjects()
    if (projects && projects.length > 0) {
      baseSceneFolders = projects
        .filter(
          (project: any) =>
            project.getInfo().sceneType === sdk.ProjectType.SCENE
        )
        .map((project) => project.getProjectWorkingDir())
      baseWearableFolders = projects
        .filter(
          (project: any) =>
            project.getInfo().sceneType === sdk.ProjectType.PORTABLE_EXPERIENCE
        )
        .map((project) => project.getProjectWorkingDir())
    }
  }

  try {
    mockCatalyst(app, [...baseSceneFolders, ...baseWearableFolders])
  } catch (err) {
    console.error(`Fatal error, couldn't mock the catalyst`, err)
  }

  try {
    mockPreviewWearables(app, baseWearableFolders)
  } catch (err) {
    console.error(`Fatal error, couldn't mock the wearables`, err)
  }

  app.get('/content/contents/:hash', (_req, res) => {
    return res.end(404)
  })

  app.get('/scene.json', (_req, res) => {
    return res.send('')
  })

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

  createStaticRoutes(
    app,
    '/images/decentraland-connect/*',
    dclKernelImagesDecentralandConnect
  )
  createStaticRoutes(
    app,
    '/@/artifacts/unity-renderer/*',
    dclUnityRenderer,
    (filePath) => filePath.replace(/.br+$/, '')
  )
  createStaticRoutes(app, '/@/artifacts/loader/*', dclKernelLoaderPath)
  createStaticRoutes(app, '/default-profile/*', dclKernelDefaultProfilePath)
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export = setupProxy
