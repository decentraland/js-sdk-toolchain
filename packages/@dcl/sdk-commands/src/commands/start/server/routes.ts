import path from 'path'
import QRCode from 'qrcode'
import { Router } from '@well-known-components/http-server'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { WebSocket } from 'ws'
import { dumpEngineToCrdtCommands } from '@dcl/inspector'
import { Workspace } from '../../../logic/workspace-validations'
import { DataLayer } from '../data-layer/rpc'
import { handleDataLayerWs } from '../data-layer/ws'
import { PreviewComponents } from '../types'
import { setupEcs6Endpoints } from './endpoints'
import { setupRealmAndComms } from './realm'
import { getLanUrl } from '../utils'
import { buildEngineFromScene, Scene, SceneEntity, readMainEntities, writeMainEntities } from '../../../logic/main-entities'
import { printError } from '../../../logic/beautiful-logs'

export const sceneUpdateClients = new Set<WebSocket>()
export async function wireRouter(components: PreviewComponents, workspace: Workspace, dataLayer?: DataLayer) {
  const router = new Router<PreviewComponents>()

  if (dataLayer) {
    router.get('/data-layer', async (ctx, next) => {
      if (ctx.request.headers.get('upgrade') === 'websocket') {
        return upgradeWebSocketResponse((ws) => handleDataLayerWs(components, ws as any, dataLayer))
      }

      return next()
    })
  }

  router.get('/', async (ctx, next) => {
    if (ctx.request.headers.get('upgrade') === 'websocket') {
      return upgradeWebSocketResponse((ws) => initWsConnection(ws as any as WebSocket, sceneUpdateClients))
    }

    return next()
  })

  const localSceneParcels: string[] = []
  const baseParcel = workspace.projects[0].scene.scene.base
  for (const project of workspace.projects) {
    for (const parcel of project.scene.scene.parcels) {
      localSceneParcels.push(parcel)
    }
  }

  // Mobile preview QR code endpoint
  router.get('/mobile-preview', async (ctx) => {
    const lanUrl = getLanUrl(ctx.url.port)
    if (!lanUrl) {
      return {
        status: 404,
        body: { ok: false, error: 'No LAN IP address found' }
      }
    }

    const [x, y] = baseParcel.split(',')
    const deepLink = `decentraland://open?preview=${lanUrl}&position=${x},${y}`
    const qrDataUrl = await QRCode.toDataURL(deepLink)

    return {
      headers: { 'content-type': 'application/json' },
      body: {
        ok: true,
        data: {
          url: deepLink,
          qr: qrDataUrl
        }
      }
    }
  })

  // ── Editor changes (main.json) ────────────────────────────
  // Read/write the per-scene main.json from disk via the preview server,
  // and regenerate main.crdt synchronously on every write so the next
  // scene reload picks up the saved entity transforms.
  const workingDirectory = workspace.projects[0]?.workingDirectory
  if (workingDirectory) {
    setupEditorChangesEndpoints(components, router, workingDirectory)
  }

  setupRealmAndComms(components, router, localSceneParcels)
  await setupEcs6Endpoints(components, router, workspace)

  components.server.setContext(components)
  components.server.use(router.allowedMethods())
  components.server.use(router.middleware())
}

// ── /editor/changes ──────────────────────────────────────────

function setupEditorChangesEndpoints(
  components: PreviewComponents,
  router: Router<PreviewComponents>,
  workingDirectory: string
): void {
  // Serialize all writes so concurrent POSTs don't race on read-modify-write.
  let writeQueue: Promise<void> = Promise.resolve()

  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  }

  router.options('/editor/changes', async () => ({ status: 204, headers: corsHeaders }))

  router.get('/editor/changes', async () => {
    const data = (await readMainEntities(components, workingDirectory)) ?? {}
    return {
      headers: { 'content-type': 'application/json', ...corsHeaders },
      body: data
    }
  })

  router.post('/editor/changes', async (ctx) => {
    let updates: Scene
    try {
      updates = (await ctx.request.json()) as Scene
    } catch {
      return {
        status: 400,
        headers: corsHeaders,
        body: { ok: false, error: 'Invalid JSON body' }
      }
    }
    if (typeof updates !== 'object' || updates === null || Array.isArray(updates)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: { ok: false, error: 'Body must be a name-keyed object' }
      }
    }

    const enqueued = writeQueue.then(async () => {
      const current = (await readMainEntities(components, workingDirectory)) ?? {}
      mergeUpdates(current, updates)
      await writeMainEntities(components, workingDirectory, current)
      await regenerateMainCrdt(components, workingDirectory, current)
    })
    writeQueue = enqueued.catch(() => undefined)

    try {
      await enqueued
    } catch (err) {
      printError(components.logger, 'Failed to apply /editor/changes', err as Error)
      return {
        status: 500,
        headers: corsHeaders,
        body: { ok: false, error: (err as Error).message ?? 'unknown error' }
      }
    }

    const names = Object.keys(updates).join(', ')
    components.logger.log(`[editor] updated: ${names}`)
    return {
      headers: corsHeaders,
      body: { ok: true, count: Object.keys(updates).length }
    }
  })
}

function mergeUpdates(target: Scene, updates: Scene): void {
  for (const [name, incoming] of Object.entries(updates)) {
    const existing: SceneEntity = target[name] ?? { components: {} }
    target[name] = {
      components: {
        ...existing.components,
        ...(incoming?.components ?? {})
      }
    }
  }
}

async function regenerateMainCrdt(
  components: Pick<PreviewComponents, 'fs' | 'logger'>,
  workingDirectory: string,
  scene: Scene
): Promise<void> {
  if (Object.keys(scene).length === 0) return
  const engine = buildEngineFromScene(scene)
  const crdtData = dumpEngineToCrdtCommands(engine as any)
  await components.fs.writeFile(path.join(workingDirectory, 'main.crdt'), crdtData)
}

const initWsConnection = (ws: WebSocket, clients: Set<WebSocket>) => {
  if (ws.readyState === ws.OPEN) {
    clients.add(ws)
  } else {
    ws.on('open', () => clients.add(ws))
  }
  ws.on('close', () => clients.delete(ws))
}
