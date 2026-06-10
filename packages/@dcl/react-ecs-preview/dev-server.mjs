// Tiny esbuild-powered dev server for previewing @dcl/react-ecs UIs in the browser.
//
//   DEMO MODE   (default):       npm start
//     Bundles src/main.tsx and renders the sample UI in src/demo/ui.tsx.
//
//   SCENE MODE  (SCENE_ENTRY=…):  SCENE_ENTRY=/path/to/scene/preview.debug.tsx npm start
//     Bundles a real scene's UI. @dcl/sdk/ecs and @dcl/sdk/react-ecs are aliased
//     to this monorepo's packages so the scene shares ONE engine with the preview;
//     host-only modules (players/network/platform/server, ~system/*) are mocked.
//
// In both modes the page live-reloads on every rebuild. No install needed: esbuild
// is reused from @dcl/sdk-commands.
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import http from 'http'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const esbuild = require(path.resolve(__dirname, '../sdk-commands/node_modules/esbuild'))

const dcl = path.resolve(__dirname, '..') // packages/@dcl
const PORT = Number(process.env.PORT) || 8123
const SCENE_ENTRY = process.env.SCENE_ENTRY ? path.resolve(process.env.SCENE_ENTRY) : null
const SCENE_ROOT = SCENE_ENTRY ? path.dirname(SCENE_ENTRY) : null

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav'
}

// Serves the scene's static files (images/, audio, …) so texture/audio `src`
// paths resolve. Runs on its own port; CSS background-images don't need CORS.
function startAssetServer(root, port) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '')
    const file = path.join(root, rel)
    if (!file.startsWith(root)) {
      res.writeHead(403).end()
      return
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end()
        return
      }
      res.writeHead(200, { 'content-type': CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' })
      res.end(data)
    })
  })
  server.listen(port)
  return `http://localhost:${port}/`
}

const assetBase = SCENE_ROOT ? startAssetServer(SCENE_ROOT, PORT + 1) : ''

const mock = (name) => path.join(__dirname, 'src/mocks', name)

const sharedAlias = {
  '@dcl/react-ecs': path.join(dcl, 'react-ecs/dist/index.js'),
  '@dcl/ecs': path.join(dcl, 'ecs/dist/index.js'),
  '@dcl/ecs/dist/components': path.join(dcl, 'ecs/dist/components/index.js')
}

// Scene mode remaps the sdk entrypoints onto our packages + mocks.
const sceneAlias = {
  ...sharedAlias,
  '@dcl/sdk/react-ecs': path.join(dcl, 'react-ecs/dist/index.js'),
  '@dcl/sdk/ecs': path.join(dcl, 'ecs/dist/index.js'),
  '@dcl/sdk/players': mock('players.ts'),
  '@dcl/sdk/network': mock('network.ts'),
  '@dcl/sdk/platform': mock('platform.ts'),
  '@dcl/sdk/server': mock('server.ts'),
  '~system/SignedFetch': mock('signed-fetch.ts')
}

const common = {
  bundle: true,
  format: 'esm',
  sourcemap: true,
  target: 'es2020',
  jsx: 'transform',
  jsxFactory: 'ReactEcs.createElement',
  jsxFragment: 'ReactEcs.Fragment',
  outfile: path.join(__dirname, 'public/bundle.js'),
  define: {
    'process.env.NODE_ENV': '"development"',
    global: 'globalThis',
    __PREVIEW_MOBILE__: process.env.PREVIEW_MOBILE === '1' ? 'true' : 'false',
    __SCENE_ASSETS__: JSON.stringify(assetBase)
  },
  banner: { js: "globalThis.process = globalThis.process || { env: { NODE_ENV: 'development' } };" },
  logLevel: 'info'
}

const config = SCENE_ENTRY
  ? {
      ...common,
      alias: sceneAlias,
      // Virtual entry: import the scene's debug file (registers the UI as a side
      // effect), then start the preview loop.
      stdin: {
        contents: [
          // Default export (if any) is a map of named scenarios; the import also
          // runs the scene's setUiRenderer(...) as a side effect.
          `import scenarios from ${JSON.stringify(SCENE_ENTRY)}`,
          `import { startScenePreview } from ${JSON.stringify(path.join(__dirname, 'src/scene-main.ts'))}`,
          `startScenePreview(scenarios)`
        ].join('\n'),
        resolveDir: __dirname,
        loader: 'ts'
      }
    }
  : {
      ...common,
      alias: sharedAlias,
      entryPoints: [path.join(__dirname, 'src/main.tsx')]
    }

const ctx = await esbuild.context(config)
await ctx.watch()
const { port } = await ctx.serve({ servedir: path.join(__dirname, 'public'), port: PORT })

console.log(`\n  ⚡ react-ecs preview → http://localhost:${port}`)
if (SCENE_ENTRY) {
  console.log(`  scene mode: ${SCENE_ENTRY}`)
  console.log(`  serving scene assets from ${SCENE_ROOT} → ${assetBase}`)
  console.log('  Edit the scene UI and the page hot-reloads.\n')
} else {
  console.log('  demo mode: edit src/demo/ui.tsx and the page hot-reloads.\n')
}
