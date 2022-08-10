import * as path from 'path'
import { createProxyMiddleware } from 'http-proxy-middleware'
import * as express from 'express'
import { getSceneJson } from '../setupUtils'
import { getAllPreviewWearables } from '../wearables'

export const mockCatalyst = (
  app: express.Application,
  baseFolders: string[]
) => {
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

  app.get('/lambdas/profiles', async (req, res, next) => {
    try {
      const previewWearables = await getAllPreviewWearables({
        baseFolders,
        baseUrl: ''
      }).map((wearable) => wearable.id)

      if (previewWearables.length === 1) {
        const deployedProfile = await (
          await fetch(`https://peer.decentraland.org${req.originalUrl}`)
        ).json()
        if (deployedProfile?.length === 1) {
          deployedProfile[0].avatars[0].avatar.wearables.push(
            ...previewWearables
          )
          return res.json(deployedProfile)
        }
      }
    } catch (err) {
      console.warn(
        `Failed to catch profile and fill with preview wearables.`,
        err
      )
    }

    return next()
  })

  // fallback all lambdas to a real catalyst
  app.use(
    '/lambdas',
    createProxyMiddleware({
      target: 'https://peer.decentraland.org/',
      changeOrigin: true,
      timeout: 25 * 1000,
      proxyTimeout: 25 * 1000,
      onError: (err, req_, res) => {
        console.warn(`Oops, it seems the catalyst isn't working well.`)
        res.writeHead(500)
        res.end('')
      }
    })
  )

  // fallback all lambdas to a real catalyst
  app.use(
    '/content',
    createProxyMiddleware({
      target: 'https://peer.decentraland.org/',
      changeOrigin: true,
      timeout: 25 * 1000,
      proxyTimeout: 25 * 1000,
      onError: (err, req_, res) => {
        console.warn(`Oops, it seems the content server isn't working well.`)
        res.writeHead(500)
        res.end('')
      }
    })
  )
}

const serveFolders = (app: express.Application, baseFolders: string[]) => {
  app.get('/content/contents/:hash', (req, res, next) => {
    if (req.params.hash && req.params.hash.startsWith('b64-')) {
      const fullPath = path.resolve(
        Buffer.from(req.params.hash.replace(/^b64-/, ''), 'base64').toString(
          'utf8'
        )
      )

      // only return files IF the file is within a baseFolder
      if (!baseFolders.find((folder: string) => fullPath.startsWith(folder))) {
        next()
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

  function pointerRequestHandler(pointers: unknown) {
    if (!pointers) {
      return []
    }

    const requestedPointers = new Set<string>(
      pointers && typeof pointers === 'string'
        ? [pointers as string]
        : (pointers as string[])
    )

    const resultEntities = getSceneJson({
      baseFolders,
      pointers: Array.from(requestedPointers)
    })

    return resultEntities
  }

  app.get('/content/entities/scene', (req, res) => {
    return res.json(pointerRequestHandler(req.query.pointer)).end()
  })

  app.post('/content/entities/active', (req, res) => {
    return res.json(pointerRequestHandler(req.body.pointers)).end()
  })
}
