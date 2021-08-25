import * as path from 'path'
import * as fs from 'fs'
import { createProxyMiddleware } from 'http-proxy-middleware'
import * as express from 'express'
import { getSceneJson } from './setupUtils'

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

  mockCatalyst(app, [dcl.getWorkingDir()])

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
  createStaticRoutes(app, '/@/artifacts/unity-renderer/*', dclUnityRenderer)
  createStaticRoutes(app, '/@/artifacts/loader/*', dclKernelLoaderPath)
  createStaticRoutes(app, '/default-profile/*', dclKernelDefaultProfilePath)
}

const createStaticRoutes = (app: express.Application, route: string, localFolder: string) => {
  app.use(route, (req, res, next) => {
    const options = {
      root: localFolder,
      dotfiles: 'deny',
      maxAge: 1,
      cacheControl: false,
      lastModified: true,
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true,
        etag: JSON.stringify(Date.now().toString()),
        'cache-control': 'no-cache,private,max-age=1'
      }
    }

    const fileName = req.params[0]

    res.sendFile(fileName, options, (err) => {
      if (err) {
        next(err)
      }
    })
  })
}

const mockCatalyst = (app: express.Application, baseFolders: string[]) => {
  serveFolders(app, baseFolders)
  app.get('/lambdas/explore/realms', (req, res) => {
    res.json([
      {
        serverName: 'localhost',
        url: `http://${req.get('host')}`,
        layer: 'stub',
        usersCount: 0,
        maxUsers: 100,
        userParcels: []
      }
    ])
  })

  app.get('/lambdas/contracts/servers', (req, res) => {
    res.json([
      {
        address: `http://${req.get('host')}`,
        owner: '0x0000000000000000000000000000000000000000',
        id: '0x0000000000000000000000000000000000000000000000000000000000000000'
      }
    ])
  })

  // fallback all lambdas to a real catalyst
  app.use(
    '/lambdas',
    createProxyMiddleware({
      target: 'https://peer-lb.decentraland.org/',
      changeOrigin: true
    })
  )

  // fallback all lambdas to a real catalyst
  app.use(
    '/content',
    createProxyMiddleware({
      target: 'https://peer-lb.decentraland.org/',
      changeOrigin: true
    })
  )
}

const serveFolders = (app: express.Application, baseFolders: string[]) => {
  app.get('/content/contents/:hash', (req, res, next) => {
    if (req.params.hash && req.params.hash.startsWith('b64-')) {
      const fullPath = path.resolve(Buffer.from(req.params.hash.replace(/^b64-/, ''), 'base64').toString('utf8'))

      // only return files IF the file is within a baseFolder
      if (!baseFolders.find(($) => fullPath.startsWith($))) {
        res.end(404)
        return
      }

      const options = {
        dotfiles: 'deny',
        maxAge: 1,
        cacheControl: false,
        lastModified: true,
        headers: {
          'x-timestamp': Date.now(),
          'x-sent': true,
          etag: JSON.stringify(Date.now().toString()),
          'cache-control': 'no-cache,private,max-age=1'
        }
      }

      res.sendFile(fullPath, options, (err) => {
        if (err) {
          next(err)
        }
      })
    }
  })

  app.get('/content/entities/scene', (req, res) => {
    if (!req.query.pointer) {
      res.json([])
      return
    }

    const requestedPointers = new Set<string>(
      req.query.pointer && typeof req.query.pointer == 'string'
        ? [req.query.pointer as string]
        : (req.query.pointer as string[])
    )

    const resultEntities = getSceneJson({ baseFolders, pointers: Array.from(requestedPointers) })
    res.json(resultEntities).end()
  })
}

// @ts-ignore
export = setupProxy
