import path from 'path'
import QRCode from 'qrcode'
import { Router } from '@well-known-components/http-server'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { WebSocket } from 'ws'
import { Workspace } from '../../../logic/workspace-validations'
import { DataLayer } from '../data-layer/rpc'
import { handleDataLayerWs } from '../data-layer/ws'
import { PreviewComponents } from '../types'
import { setupEcs6Endpoints } from './endpoints'
import { setupStorageEndpoints } from './storage-service'
import { setupRealmAndComms } from './realm'
import { getLanUrl } from '../utils'

export const sceneUpdateClients = new Set<WebSocket>()

// ---- Editor changes accumulator ----

/** Accumulated editor entity changes, keyed by entity name */
const editorChanges = new Map<string, object>()
let editorWriteTimer: ReturnType<typeof setTimeout> | null = null
let editorChangesPath: string | null = null
let editorFsComponent: PreviewComponents['fs'] | null = null

const EDITOR_WRITE_DEBOUNCE_MS = 1000

function handleEditorMessage(data: string, logger: PreviewComponents['logger']) {
  try {
    const msg = JSON.parse(data)
    if (msg.type !== 'editor-update' || !msg.name) return

    editorChanges.set(msg.name, { components: msg.components })
    logger.log(`[editor] updated: ${msg.name}`)

    // Debounce file write
    if (editorWriteTimer) clearTimeout(editorWriteTimer)
    editorWriteTimer = setTimeout(() => flushEditorChanges(logger), EDITOR_WRITE_DEBOUNCE_MS)
  } catch {
    // Not JSON or not an editor message — ignore
  }
}

async function flushEditorChanges(logger: PreviewComponents['logger']) {
  editorWriteTimer = null
  if (!editorChangesPath || !editorFsComponent || editorChanges.size === 0) return

  try {
    const obj = Object.fromEntries(editorChanges)
    const content = JSON.stringify(obj, null, 2)
    await editorFsComponent.writeFile(editorChangesPath, Buffer.from(content, 'utf-8'))
    logger.log(`[editor] wrote ${editorChanges.size} entities to editor-changes.json`)
  } catch (err: any) {
    logger.error(`[editor] failed to write editor-changes.json: ${err.message || err}`)
  }
}

// ---- Router setup ----

export async function wireRouter(components: PreviewComponents, workspace: Workspace, dataLayer?: DataLayer) {
  const router = new Router<PreviewComponents>()

  // Store fs and working directory for editor file writes
  const workingDirectory = workspace.projects[0]?.workingDirectory || process.cwd()
  editorChangesPath = path.join(workingDirectory, 'src', '__editor', 'editor-scene.json')
  editorFsComponent = components.fs

  // Seed in-memory map from existing file on disk
  try {
    const content = await components.fs.readFile(editorChangesPath, 'utf-8')
    const data = JSON.parse(content as string) as Record<string, object>
    for (const [name, value] of Object.entries(data)) {
      editorChanges.set(name, value)
    }
    if (editorChanges.size > 0) {
      components.logger.log(`[editor] loaded ${editorChanges.size} entities from editor-scene.json`)
    }
  } catch {
    // File doesn't exist yet — that's fine
  }

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
      return upgradeWebSocketResponse((ws) => initWsConnection(ws as any as WebSocket, sceneUpdateClients, components))
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

  // Editor changes — serve accumulated changes from memory
  router.get('/editor/changes', async () => {
    return {
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*'
      },
      body: Object.fromEntries(editorChanges)
    }
  })

  // Editor changes — accept updates via POST (used by auth-server when WebSocket is unavailable)
  router.post('/editor/changes', async (ctx) => {
    try {
      const body = await ctx.request.json()
      if (body && typeof body === 'object') {
        for (const [name, value] of Object.entries(body)) {
          if (name && value && typeof value === 'object') {
            editorChanges.set(name, value)
            components.logger.log(`[editor] updated: ${name}`)
          }
        }
        if (editorWriteTimer) clearTimeout(editorWriteTimer)
        editorWriteTimer = setTimeout(() => flushEditorChanges(components.logger), EDITOR_WRITE_DEBOUNCE_MS)
      }
      return {
        headers: { 'access-control-allow-origin': '*' },
        body: { ok: true }
      }
    } catch (err: any) {
      return {
        status: 400,
        headers: { 'access-control-allow-origin': '*' },
        body: { ok: false, error: err.message || 'Invalid request' }
      }
    }
  })

  setupRealmAndComms(components, router, localSceneParcels)
  setupStorageEndpoints(components, router, workspace)
  await setupEcs6Endpoints(components, router, workspace)

  components.server.setContext(components)
  components.server.use(router.allowedMethods())
  components.server.use(router.middleware())
}

const initWsConnection = (ws: WebSocket, clients: Set<WebSocket>, components: PreviewComponents) => {
  if (ws.readyState === ws.OPEN) {
    clients.add(ws)
  } else {
    ws.on('open', () => clients.add(ws))
  }

  // Handle incoming text messages (editor updates)
  // Binary messages are protobuf scene updates — ignore those
  ws.on('message', (data, isBinary) => {
    if (isBinary) return
    handleEditorMessage(data.toString(), components.logger)
  })

  ws.on('close', () => clients.delete(ws))
}
