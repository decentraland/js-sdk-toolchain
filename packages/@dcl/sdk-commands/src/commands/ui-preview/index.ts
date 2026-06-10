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

    Zero-config: runs the scene's main() and renders whatever UI it registers.

    Panels: add a ui-preview.tsx that calls your setup and default-exports
    named functions seeding game state — each becomes a sidebar entry, so you
    can flip through every screen without playing to reach it.

    Stories: any *.stories.tsx file (named function exports returning JSX)
    becomes a sidebar group; each story renders that component in isolation —
    a storybook for your scene's components.

    Options:
      -h, --help            Displays this help
      --dir <path>          Scene directory (default: current directory)
      --entry <file>        UI entry file (default: ui-preview.tsx, else main())
      -p, --port <number>   Preview server port (default: auto)
      --no-browser          Do not open the browser automatically
      --mobile              Force isMobile()=true regardless of canvas preset

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

  const entry = await describeEntry(workingDir, options.args['--entry'], logger)

  const port = await getPort(options.args['--port'] || 0)
  const assetPort = port + 1
  const assetBase = startAssetServer(workingDir, assetPort)

  // Serve from a temp dir so we never write the bundle into node_modules.
  const servedir = await fs.mkdtemp(path.join(os.tmpdir(), 'dcl-ui-preview-'))
  await fs.copyFile(path.join(harnessDir, 'public', 'index.html'), path.join(servedir, 'index.html'))

  const mock = (n: string) => path.join(harnessDir, 'mocks', n)

  // Both 'preview:entry' (the scene's ui-preview.tsx panels, or its main() as the
  // zero-config fallback) and 'preview:stories' (the *.stories.tsx catalog) are
  // virtual modules re-resolved on every rebuild — so creating either kind of
  // file (by hand or via the sidebar's "create it for me" button) hot-swaps in
  // without restarting the server.
  const stdinContents = [
    `import scenarios, { __entryMeta } from 'preview:entry'`,
    `import stories from 'preview:stories'`,
    `import { startScenePreview } from ${JSON.stringify(path.join(harnessDir, 'scene-main.ts'))}`,
    `startScenePreview(scenarios, stories, __entryMeta)`
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
    plugins: [systemStubPlugin(), entryPlugin(workingDir, options.args['--entry']), storiesPlugin(workingDir)],
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

type ResolvedEntry = { kind: 'file' | 'main' | 'none'; path: string }

// Entry resolution, friendliest first:
//   1. --entry <file>
//   2. ui-preview.tsx (full control: seeded state + named panels)
//   3. zero-config: the scene's own main() from src/index.ts — what the runtime
//      runs in-world, so whatever the scene shows on boot shows here too
// Re-evaluated on every rebuild (see entryPlugin), so creating/removing the file
// hot-swaps modes without a server restart. This sync version is shared by the
// plugin and the startup banner.
function resolveEntrySync(workingDir: string, explicit: string | undefined): ResolvedEntry {
  if (explicit) {
    const p = path.resolve(workingDir, explicit)
    if (!fsSync.existsSync(p)) throw new CliError('UI_PREVIEW_ENTRY_NOT_FOUND', `--entry file not found: ${p}`)
    return { kind: 'file', path: p }
  }
  for (const c of [...ENTRY_CANDIDATES, 'preview.debug.tsx']) {
    const p = path.join(workingDir, c)
    if (fsSync.existsSync(p)) return { kind: 'file', path: p }
  }
  for (const idx of ['src/index.ts', 'src/index.tsx', 'src/index.js']) {
    const p = path.join(workingDir, idx)
    if (!fsSync.existsSync(p)) continue
    const code = fsSync.readFileSync(p, 'utf8')
    if (/export\s+(async\s+)?function\s+main\s*\(/.test(code) || /export\s*\{[^}]*\bmain\b/.test(code)) {
      return { kind: 'main', path: p }
    }
  }
  return { kind: 'none', path: '' }
}

async function describeEntry(
  workingDir: string,
  explicit: string | undefined,
  logger: Options['components']['logger']
): Promise<ResolvedEntry> {
  const entry = resolveEntrySync(workingDir, explicit)
  if (entry.kind === 'main') {
    logger.log('')
    logger.log(
      `  ${colors.dim('running the scene')} main() ${colors.dim(
        '— use the sidebar to add panels for specific screens'
      )}`
    )
  } else if (entry.kind === 'none') {
    logger.log('')
    logger.log(`  ${colors.yellowBright('No UI entry found')} — use the sidebar buttons to create one.`)
  }
  return entry
}

// 'preview:entry' — virtual module that re-resolves the entry each rebuild.
// watchFiles/watchDirs make esbuild rebuild when a ui-preview.tsx appears or
// disappears, so the sidebar's "create it for me" flow needs no restart.
function entryPlugin(workingDir: string, explicit: string | undefined): esbuild.Plugin {
  return {
    name: 'dcl-preview-entry',
    setup(build) {
      build.onResolve({ filter: /^preview:entry$/ }, (a) => ({ path: a.path, namespace: 'dcl-preview-entry' }))
      build.onLoad({ filter: /.*/, namespace: 'dcl-preview-entry' }, () => {
        const entry = resolveEntrySync(workingDir, explicit)
        // __entryMeta lets the sidebar tailor its hints — e.g. "edit your
        // ui-preview.tsx" (file exists, zero panels) vs "create one" (no file).
        const meta = `export const __entryMeta = ${JSON.stringify({
          mode: entry.kind,
          file: entry.path ? path.relative(workingDir, entry.path).split(path.sep).join('/') : ''
        })}`
        let contents: string
        if (entry.kind === 'file') {
          contents = [`import def from ${JSON.stringify(entry.path)}`, `export default def`, meta].join('\n')
        } else if (entry.kind === 'main') {
          contents = [
            `import * as scene from ${JSON.stringify(entry.path)}`,
            `Promise.resolve(typeof (scene as any).main === 'function' ? (scene as any).main() : undefined)`,
            `  .catch((e) => (window as any).__showError?.('scene main() failed: ' + ((e && e.stack) || e)))`,
            `export default undefined`,
            meta
          ].join('\n')
        } else {
          contents = [`export default undefined`, meta].join('\n')
        }
        return {
          contents,
          resolveDir: workingDir,
          loader: 'ts',
          watchFiles: ENTRY_CANDIDATES.map((c) => path.join(workingDir, c)),
          watchDirs: [workingDir]
        }
      })
    }
  }
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

  return `// Panels for 'sdk-commands ui-preview'. NOT part of the deployed scene.
//
// Each entry below becomes a button in the preview's sidebar. Clicking it puts
// your UI into that state — so you can jump straight to any screen (a menu, the
// game-over panel, ...) without playing to reach it.
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
${importLine}

${callLine}

// A visible demo so the first click does something — replace it with your own.
const ExampleBanner = () => (
  <UiEntity
    uiTransform={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
  >
    <UiEntity
      uiTransform={{ padding: 24, borderRadius: 12, flexDirection: 'column', alignItems: 'center' }}
      uiBackground={{ color: Color4.create(0.1, 0.1, 0.16, 0.95) }}
    >
      <Label value="<b>This is the 'Example' panel</b>" fontSize={22} color={Color4.White()} />
      <Label
        value="Edit ui-preview.tsx: replace this with a function that opens one of YOUR screens"
        fontSize={14}
        color={Color4.create(0.65, 0.65, 0.75, 1)}
      />
    </UiEntity>
  </UiEntity>
)

export default {
  // The name is the sidebar label; the function sets up the state for it:
  'Example panel': () => ReactEcsRenderer.setUiRenderer(ExampleBanner),

  // Real panels change YOUR scene's state, e.g.:
  // 'Shop open':  () => openShop(),
  // 'Game over':  () => GameState.create(engine.addEntity(), { state: 'ended', score: 1250 }),
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

// Storybook-style component catalog. 'preview:stories' is a virtual module that
// globs the scene for *.stories.{tsx,ts,jsx,js} on EVERY rebuild (watchDirs makes
// esbuild rebuild when files are added/removed) and exports:
//   [{ file: 'src/ui/Button.stories.tsx', mod: <namespace> }, ...]
// Story files follow CSF-lite: optional `export default { title }`, every other
// exported function is a story returning JSX.
function storiesPlugin(workingDir: string): esbuild.Plugin {
  return {
    name: 'dcl-preview-stories',
    setup(build) {
      build.onResolve({ filter: /^preview:stories$/ }, (a) => ({ path: a.path, namespace: 'dcl-preview-stories' }))
      build.onLoad({ filter: /.*/, namespace: 'dcl-preview-stories' }, async () => {
        const files = findStoryFiles(workingDir)
        const imports = files.map((f, i) => `import * as s${i} from ${JSON.stringify(f)}`)
        const entries = files.map(
          (f, i) => `{ file: ${JSON.stringify(path.relative(workingDir, f).split(path.sep).join('/'))}, mod: s${i} }`
        )
        return {
          contents: [...imports, `export default [${entries.join(', ')}]`].join('\n'),
          resolveDir: workingDir,
          loader: 'ts',
          watchDirs: storyWatchDirs(workingDir)
        }
      })
    }
  }
}

const STORY_FILE = /\.stories\.(tsx|ts|jsx|js)$/
const SKIP_DIRS = new Set(['node_modules', 'bin', 'dist', '.git', 'assets'])

function findStoryFiles(workingDir: string): string[] {
  const found: string[] = []
  const stack = [workingDir]
  while (stack.length) {
    const dir = stack.pop()!
    let entries: fsSync.Dirent[]
    try {
      entries = fsSync.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (!SKIP_DIRS.has(ent.name) && !ent.name.startsWith('.')) stack.push(full)
      } else if (STORY_FILE.test(ent.name)) {
        found.push(full)
      }
    }
  }
  return found.sort()
}

// Directories esbuild should watch for added/removed story files.
function storyWatchDirs(workingDir: string): string[] {
  const dirs = [workingDir]
  const stack = [workingDir]
  while (stack.length) {
    const dir = stack.pop()!
    let entries: fsSync.Dirent[]
    try {
      entries = fsSync.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const ent of entries) {
      if (ent.isDirectory() && !SKIP_DIRS.has(ent.name) && !ent.name.startsWith('.')) {
        const full = path.join(dir, ent.name)
        dirs.push(full)
        stack.push(full)
      }
    }
  }
  return dirs
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

// Serve the scene's static files (images/audio) so texture/audio `src` paths
// load, plus the /__scaffold endpoints behind the sidebar's "create it for me"
// buttons. CORS is open because the preview page runs on the sibling port.
function startAssetServer(root: string, port: number): string {
  http
    .createServer((req, res) => {
      res.setHeader('access-control-allow-origin', '*')
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname)

      if (req.method === 'POST' && pathname.startsWith('/__scaffold/')) {
        const force = new URL(req.url || '/', 'http://x').searchParams.get('force') === '1'
        void handleScaffold(root, pathname.slice('/__scaffold/'.length), force, res)
        return
      }

      const file = path.join(root, pathname.replace(/^\/+/, ''))
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

// Writes the starter file for the requested kind. The esbuild watcher picks the
// new file up (watchFiles/watchDirs on the virtual modules) and the page
// live-reloads with it — no restart. `force` overwrites an existing file, but
// ONLY when it demonstrably has no creator content (empty default export) —
// never clobber edited files.
async function handleScaffold(root: string, kind: string, force: boolean, res: http.ServerResponse): Promise<void> {
  try {
    let target: string
    let contents: string
    if (kind === 'panels') {
      target = path.join(root, 'ui-preview.tsx')
      contents = await scaffoldEntry(root)
    } else if (kind === 'stories') {
      target = path.join(root, 'src', 'example.stories.tsx')
      contents = STORIES_EXAMPLE
    } else {
      res.writeHead(400).end()
      return
    }
    if (fsSync.existsSync(target)) {
      const overwritable = kind === 'panels' && hasEmptyDefaultExport(await fs.readFile(target, 'utf8'))
      if (!(force && overwritable)) {
        res
          .writeHead(409, { 'content-type': 'text/plain' })
          .end(`${overwritable ? 'EMPTY' : 'EDITED'}:${path.basename(target)}`)
        return
      }
    }
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, contents, 'utf8')
    res.writeHead(201, { 'content-type': 'text/plain' }).end(path.relative(root, target))
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' }).end(String(e))
  }
}

// True when the file's default export is an object with no entries (comments
// aside) — i.e. an untouched scaffold that is safe to replace.
function hasEmptyDefaultExport(code: string): boolean {
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  return /export\s+default\s*\{\s*\}/.test(stripped)
}

// Self-contained example — imports only the SDK, so it compiles in any scene.
const STORIES_EXAMPLE = `// Component stories for 'sdk-commands ui-preview'. NOT part of the deployed scene.
// Every exported function is a "story": it renders alone, centered on the canvas.
// Rename this file / copy it next to your own components (anything *.stories.tsx works).
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'

export default { title: 'Examples/Badge' } // group name in the sidebar

const Badge = (props: { text: string; color: Color4 }) => (
  <UiEntity
    uiTransform={{ padding: { top: 6, bottom: 6, left: 16, right: 16 }, borderRadius: 14, alignItems: 'center' }}
    uiBackground={{ color: props.color }}
  >
    <Label value={props.text} fontSize={14} color={Color4.White()} />
  </UiEntity>
)

export const Success = () => <Badge text="success" color={Color4.create(0.18, 0.65, 0.35, 1)} />
export const Warning = () => <Badge text="warning" color={Color4.create(0.85, 0.6, 0.1, 1)} />

// Now try one with YOUR component:
// import { MyButton } from './ui/MyButton'
// export const MyButtonDefault = () => <MyButton label="Click me" />
`
