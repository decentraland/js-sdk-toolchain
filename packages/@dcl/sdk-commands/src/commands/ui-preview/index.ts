import path from 'path'
import http from 'http'
import os from 'os'
import fsSync from 'fs'
import { promises as fs } from 'fs'
import esbuild from 'esbuild'
import open from 'open'
import { Result } from 'arg'

import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { getPort } from '../../logic/get-free-port'
import { CliError } from '../../logic/error'
import { colors } from '../../components/log'

interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'fs' | 'logger'>
}

export const args = declareArgs({
  '--dir': String,
  '--port': Number,
  '--entry': String,
  '--no-browser': Boolean,
  '--mobile': Boolean,
  '-p': '--port',
  '-h': '--help'
})

export async function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands ui-preview [options]'

    Renders the scene's react-ecs UI in the browser with hot-reload, so you can
    iterate on layout without launching the full 3D client.

    Zero-config: with no extra files it runs the scene's main() and renders
    whatever UI the scene registers on boot. Add a ui-preview.tsx to seed game
    state and declare named panels (a panel switcher appears in the toolbar).

    Options:
      -h, --help            Displays this help
      --dir <path>          Scene directory (default: current directory)
      --entry <file>        UI entry file (default: ui-preview.tsx, else main())
      -p, --port <number>   Preview server port (default: auto)
      --no-browser          Do not open the browser automatically
      --mobile              Start in mobile (isMobile=true) layout

    Example:
      sdk-commands ui-preview
`)
}

const ENTRY_CANDIDATES = ['ui-preview.tsx', 'ui-preview.ts', 'ui-preview.jsx', 'ui-preview.js']

export async function main(options: Options) {
  const { logger } = options.components
  const workingDir = path.resolve(process.cwd(), options.args['--dir'] || '.')
  const harnessDir = path.join(__dirname, 'harness')

  // Resolve the scene's own @dcl/sdk subpaths (layout varies across SDK versions:
  // flat ecs.js vs ecs/index.js) so the harness shares ONE engine with the scene.
  const resolveSdk = (subpath: string): string => {
    try {
      return require.resolve(`@dcl/sdk/${subpath}`, { paths: [workingDir] })
    } catch {
      throw new CliError(
        'UI_PREVIEW_SDK_NOT_FOUND',
        `Could not resolve '@dcl/sdk/${subpath}' from ${workingDir}. Run this inside a scene folder (after 'npm install').`
      )
    }
  }
  const sdkEcs = resolveSdk('ecs')
  const sdkReactEcs = resolveSdk('react-ecs')
  const sdkMath = resolveSdk('math')

  const entry = await resolveEntry(workingDir, options.args['--entry'], logger)

  const port = await getPort(options.args['--port'] || 0)
  const assetPort = port + 1
  const assetBase = startAssetServer(workingDir, assetPort)

  // Serve from a temp dir so we never write the bundle into node_modules.
  const servedir = await fs.mkdtemp(path.join(os.tmpdir(), 'dcl-ui-preview-'))
  await fs.copyFile(path.join(harnessDir, 'public', 'index.html'), path.join(servedir, 'index.html'))

  const mock = (n: string) => path.join(harnessDir, 'mocks', n)

  // Two entry modes:
  //  - 'file': a ui-preview.tsx — importing it registers the UI; its default
  //    export (if any) is a map of named panel scenarios.
  //  - 'main': zero-config — run the scene's real main() from src/index.ts,
  //    exactly what the runtime does in-world (minus the 3D rendering).
  const stdinContents =
    entry.kind === 'file'
      ? [
          `import scenarios from ${JSON.stringify(entry.path)}`,
          `import { startScenePreview } from ${JSON.stringify(path.join(harnessDir, 'scene-main.ts'))}`,
          `startScenePreview(scenarios)`
        ].join('\n')
      : [
          `import * as scene from ${JSON.stringify(entry.path)}`,
          `import { startScenePreview } from ${JSON.stringify(path.join(harnessDir, 'scene-main.ts'))}`,
          `Promise.resolve(typeof (scene as any).main === 'function' ? (scene as any).main() : undefined)`,
          `  .catch((e) => (window as any).__showError?.('scene main() failed: ' + ((e && e.stack) || e)))`,
          `startScenePreview(undefined)`
        ].join('\n')

  const ctx = await esbuild.context({
    stdin: {
      contents: stdinContents,
      resolveDir: harnessDir,
      loader: 'ts'
    },
    bundle: true,
    format: 'esm',
    sourcemap: true,
    target: 'es2020',
    jsx: 'transform',
    jsxFactory: 'ReactEcs.createElement',
    jsxFragment: 'ReactEcs.Fragment',
    outfile: path.join(servedir, 'bundle.js'),
    define: {
      'process.env.NODE_ENV': '"development"',
      global: 'globalThis',
      __SCENE_ASSETS__: JSON.stringify(assetBase),
      __PREVIEW_MOBILE__: options.args['--mobile'] ? 'true' : 'false'
    },
    banner: { js: "globalThis.process = globalThis.process || { env: { NODE_ENV: 'development' } };" },
    // Pin ecs/react-ecs/math to the scene's own @dcl/sdk so the harness and the
    // scene UI share ONE engine. Other sdk modules (network/players/server/…) are
    // the scene's REAL implementations — the ~system/* catch-all below neutralizes
    // host calls at the bottom layer, so every named export always exists no matter
    // the SDK version. Only `platform` is mocked: older SDKs lack it, and the
    // preview drives isMobile() from the canvas selector.
    alias: {
      '@dcl/sdk/ecs': sdkEcs,
      '@dcl/sdk/react-ecs': sdkReactEcs,
      '@dcl/sdk/math': sdkMath,
      '@dcl/sdk/platform': mock('platform.ts')
    },
    plugins: [systemStubPlugin()],
    logLevel: 'silent'
  })

  await ctx.watch()
  await ctx.serve({ servedir, port })

  const url = `http://localhost:${port}`
  logger.log('')
  logger.log(`  ${colors.greenBright('⚡ react-ecs UI preview')}  ${colors.bold(url)}`)
  logger.log(`  ${colors.dim(`scene: ${workingDir}`)}`)
  logger.log(
    `  ${colors.dim(
      `entry: ${path.relative(workingDir, entry.path)}${entry.kind === 'main' ? ' (scene main(), zero-config)' : ''}`
    )}`
  )
  logger.log(`  ${colors.dim('edit your UI and the page hot-reloads — Ctrl+C to stop')}`)
  logger.log('')

  if (!options.args['--no-browser']) {
    await open(url).catch(() => void 0)
  }

  await new Promise<void>((resolve) => {
    process.on('SIGINT', () => resolve())
    process.on('SIGTERM', () => resolve())
  })
  await ctx.dispose()
}

type ResolvedEntry = { kind: 'file' | 'main'; path: string }

// Entry resolution, friendliest first:
//   1. --entry <file>
//   2. ui-preview.tsx (full control: seeded state + named panels)
//   3. zero-config: the scene's own main() from src/index.ts — what the runtime
//      runs in-world, so whatever the scene shows on boot shows here too
//   4. scaffold a starter ui-preview.tsx (no main() found)
async function resolveEntry(
  workingDir: string,
  explicit: string | undefined,
  logger: Options['components']['logger']
): Promise<ResolvedEntry> {
  if (explicit) {
    const p = path.resolve(workingDir, explicit)
    if (!fsSync.existsSync(p)) throw new CliError('UI_PREVIEW_ENTRY_NOT_FOUND', `--entry file not found: ${p}`)
    return { kind: 'file', path: p }
  }
  for (const c of [...ENTRY_CANDIDATES, 'preview.debug.tsx']) {
    const p = path.join(workingDir, c)
    if (fsSync.existsSync(p)) return { kind: 'file', path: p }
  }

  // Zero-config: run the scene's real main().
  for (const idx of ['src/index.ts', 'src/index.tsx', 'src/index.js']) {
    const p = path.join(workingDir, idx)
    if (!fsSync.existsSync(p)) continue
    const code = await fs.readFile(p, 'utf8')
    if (/export\s+(async\s+)?function\s+main\s*\(/.test(code) || /export\s*\{[^}]*\bmain\b/.test(code)) {
      logger.log('')
      logger.log(
        `  ${colors.dim('running the scene')} main() ${colors.dim('— create a')} ui-preview.tsx ${colors.dim(
          'to seed state and add a panel switcher'
        )}`
      )
      return { kind: 'main', path: p }
    }
  }

  const scaffolded = path.join(workingDir, 'ui-preview.tsx')
  await fs.writeFile(scaffolded, await scaffoldEntry(workingDir), 'utf8')
  logger.log('')
  logger.log(`  ${colors.yellowBright('Created ui-preview.tsx')} — edit it to register your UI and panels.`)
  logger.log('')
  return { kind: 'file', path: scaffolded }
}

async function scaffoldEntry(workingDir: string): Promise<string> {
  // Best-effort: find a `setupXxxUi` style exported function to call.
  let importLine = `// import { setupUi } from './src/ui'`
  let callLine = `// setupUi()`
  try {
    const hit = await findSetupFunction(path.join(workingDir, 'src'))
    if (hit) {
      const rel = './' + path.relative(workingDir, hit.file).replace(/\.tsx?$/, '').split(path.sep).join('/')
      importLine = `import { ${hit.name} } from '${rel}'`
      callLine = `${hit.name}()`
    }
  } catch {
    /* fall back to the commented template */
  }

  return `// Preview-only entry for 'sdk-commands ui-preview'. NOT part of the deployed scene.
// 1. Register your UI here (same call your scene makes in-world).
// 2. Optionally export a map of named panels — they appear in the preview's
//    panel switcher so you can flip between UI states without editing code.
${importLine}

${callLine}

export default {
  // 'My panel': () => openMyPanel(),
}
`
}

async function findSetupFunction(srcDir: string): Promise<{ name: string; file: string } | undefined> {
  if (!fsSync.existsSync(srcDir)) return undefined
  const stack = [srcDir]
  while (stack.length) {
    const dir = stack.pop()!
    for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules') stack.push(full)
      } else if (/\.tsx?$/.test(ent.name)) {
        const code = await fs.readFile(full, 'utf8')
        if (/setUiRenderer\s*\(/.test(code)) {
          const m = code.match(/export\s+function\s+(setup\w*[uU]i\w*)\s*\(/)
          if (m) return { name: m[1], file: full }
        }
      }
    }
  }
  return undefined
}

// Every ~system/* host module → an object whose every named import is a no-op
// async function. Lets the scene's REAL sdk modules (network/players/server)
// bundle and run with host calls neutralized.
//
// The Proxy lives on the PROTOTYPE: esbuild's __toESM interop builds its target
// with Object.create(getProtoOf(module.exports)) and then copies own keys (a
// plain Proxy reports none, dropping every named import) — but prototype-chain
// lookups still hit the Proxy's get trap, so `import { anything }` resolves.
// Every call resolves to an empty-but-shaped response: `data`/`events` are empty
// arrays (comms/engine transports iterate them), everything else is undefined —
// e.g. EngineApi.isServer() → falsy → SDK modules take their client code path.
function systemStubPlugin(): esbuild.Plugin {
  const stub = `
    const stubProto = new Proxy({}, {
      get(_t, p) {
        if (typeof p === 'symbol' || p === '__esModule' || p === 'default') return undefined
        return () => Promise.resolve({ data: [], events: [] })
      }
    })
    module.exports = Object.create(stubProto)
  `
  return {
    name: 'dcl-system-stub',
    setup(build) {
      build.onResolve({ filter: /^~system\// }, (a) => ({ path: a.path, namespace: 'dcl-system-stub' }))
      build.onLoad({ filter: /.*/, namespace: 'dcl-system-stub' }, () => ({ contents: stub, loader: 'js' }))
    }
  }
}

const CONTENT_TYPES: Record<string, string> = {
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

// Serve the scene's static files (images/audio) so texture/audio `src` paths load.
function startAssetServer(root: string, port: number): string {
  http
    .createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname).replace(/^\/+/, '')
      const file = path.join(root, rel)
      if (!file.startsWith(root)) {
        res.writeHead(403).end()
        return
      }
      fsSync.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404).end()
          return
        }
        res.writeHead(200, {
          'content-type': CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'
        })
        res.end(data)
      })
    })
    .listen(port)
  return `http://localhost:${port}/`
}
