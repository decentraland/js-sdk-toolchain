const path = require('path')
const fs = require('fs')
const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = function (dcl, app, express) {
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

  const ecsPath = path.dirname(require.resolve('decentraland-ecs/package.json', { paths: [dcl.getWorkingDir(), __dirname + '/../../'] }))
  const dclKernelPath = path.dirname(require.resolve('@dcl/kernel/package.json', { paths: [dcl.getWorkingDir(), ecsPath] }))
  const dclKernelDefaultProfilePath = path.resolve(dclKernelPath, 'default-profile')
  const dclKernelImagesDecentralandConnect = path.resolve(dclKernelPath, 'images', 'decentraland-connect')
  const dclKernelLoaderPath = path.resolve(dclKernelPath, 'loader')
  const dclUnityRenderer = path.dirname(
    require.resolve('@dcl/unity-renderer/package.json', { paths: [dcl.getWorkingDir(), ecsPath] })
  )

  const routeMappingPath = {
    '/': {
      path: path.resolve(dclKernelPath, 'preview.html'),
      type: 'text/html'
    },
    '/favicon.ico': {
      path: path.resolve(dclKernelPath, 'favicon.ico'),
      type: 'text/html'
    },
    '/@/artifacts/index.js': {
      path: path.resolve(dclKernelPath, 'index.js'),
      type: 'text/javascript'
    }
  }

  for (const route in routeMappingPath) {
    app.get(route, async (req, res) => {
      res.setHeader('Content-Type', routeMappingPath[route].type)
      const contentFile = fs.readFileSync(routeMappingPath[route].path)
      res.send(contentFile)
    })
  }

  app.use(
    '/lambdas',
    createProxyMiddleware({
      target: 'https://peer.decentraland.org/',
      changeOrigin: true
    })
  )

  createStaticRoutes(app, '/images/decentraland-connect/*', dclKernelImagesDecentralandConnect)
  createStaticRoutes(app, '/@/artifacts/unity-renderer/*', dclUnityRenderer)
  createStaticRoutes(app, '/@/artifacts/loader/*', dclKernelLoaderPath)
  createStaticRoutes(app, '/default-profile/*', dclKernelDefaultProfilePath)
}

function createStaticRoutes(app, route, localFolder) {
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
      } else {
        console.log(`Sending ${localFolder}/${fileName}`)
      }
    })
  })
}
