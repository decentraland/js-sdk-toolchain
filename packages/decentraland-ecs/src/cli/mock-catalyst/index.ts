import * as path from 'path'
import { createProxyMiddleware } from 'http-proxy-middleware'
import * as express from 'express'
import { getSceneJson } from '../setupUtils'

export const mockCatalyst = (app: express.Application, baseFolders: string[], rootFolder: string) => {
  serveFolders(app, baseFolders, rootFolder)
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

const serveFolders = (app: express.Application, baseFolders: string[], catalystRootFolder: string) => {
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

  app.get('/content/entities/scene', (req, res,next) => {
    if (!req.query.pointer) {
      res.json([])
      return
    }

    const requestedPointers = new Set<string>(
      req.query.pointer && typeof req.query.pointer == 'string'
        ? [req.query.pointer as string]
        : (req.query.pointer as string[])
    )

    const resultEntities = getSceneJson({
      baseFolders,
      pointers: Array.from(requestedPointers),
      catalystRootFolder
    })
    res.json(resultEntities).end()
  })
}
