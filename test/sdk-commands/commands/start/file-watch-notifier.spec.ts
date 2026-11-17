import { mkdtemp, realpath, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'
import chokidar, { FSWatcher } from '../../../../packages/@dcl/sdk-commands/node_modules/chokidar'
import { WsSceneMessage } from '@dcl/protocol/out-js/decentraland/sdk/development/local_development.gen'
import { wireFileWatcherToWebSockets } from '../../../../packages/@dcl/sdk-commands/src/commands/start/server/file-watch-notifier'
import { sceneUpdateClients } from '../../../../packages/@dcl/sdk-commands/src/commands/start/server/routes'
import { b64HashingFunction } from '../../../../packages/@dcl/sdk-commands/src/logic/project-files'
import { createFsComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fs'

/**
 * Regression tests for the preview hot-reload wire contract.
 *
 * On every scene rebuild the file watcher broadcasts, over the ws at the
 * server root path, and IN THIS ORDER:
 *
 *   1. a BINARY protobuf `WsSceneMessage` frame (new protocol, desktop client)
 *   2. the legacy TEXT frame: the bare string "update"
 *   3. the legacy TEXT frame: JSON {"type":"SCENE_UPDATE","payload":{...}}
 *
 * The binary-first ordering is load-bearing: bevy clients skip the binary
 * frame and react only to the legacy TEXT frames. Bevy explorers (including
 * the headless multiplayer server) speak ONLY the legacy protocol, so the
 * TEXT frames must not be removed while that is true — dropping them silently
 * kills hot reload for every bevy client.
 * See https://github.com/decentraland/bevy-explorer/issues/1083
 */

const DEBOUNCE_MS = 800

type SentFrame = { data: unknown; binary: boolean }
type WsClient = typeof sceneUpdateClients extends Set<infer T> ? T : never
const WS_OPEN = 1 // ws.WebSocket.OPEN

function makeFakeClient() {
  const frames: SentFrame[] = []
  const client = {
    readyState: WS_OPEN,
    send(data: unknown, opts?: { binary?: boolean }) {
      frames.push({ data, binary: opts?.binary === true })
    }
  } as unknown as WsClient
  return { client, frames }
}

async function waitFor(condition: () => boolean, timeoutMs: number) {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition')
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

describe('preview ws hot-reload contract (file-watch-notifier)', () => {
  const watchers: FSWatcher[] = []
  let watchSpy: jest.SpyInstance
  let projectRoot: string
  let expectedSceneId: string

  beforeAll(() => {
    // capture the watchers the notifier creates so each test can close them
    const originalWatch = chokidar.watch.bind(chokidar)
    watchSpy = jest.spyOn(chokidar, 'watch').mockImplementation((...args: Parameters<typeof chokidar.watch>) => {
      const watcher = originalWatch(...args)
      watchers.push(watcher)
      return watcher
    })
  })

  afterAll(() => {
    watchSpy.mockRestore()
  })

  afterEach(async () => {
    await Promise.all(watchers.splice(0).map((watcher) => watcher.close()))
    // drain any debounce flush already scheduled by a closed watcher so a
    // stale broadcast can never leak into the next test's client set
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 100))
    sceneUpdateClients.clear()
  })

  async function wire() {
    // realpath: on macOS os.tmpdir() is a symlink (/var -> /private/var)
    projectRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), 'sdk-ws-contract-')))
    expectedSceneId = b64HashingFunction(projectRoot)
    const components = { fs: createFsComponent(), ws: undefined, logger: undefined } as unknown as Parameters<
      typeof wireFileWatcherToWebSockets
    >[0]
    await wireFileWatcherToWebSockets(components, projectRoot, 'scene')
    // a file event (plus the initial scan, all merged by the 800ms debounce)
    // triggers one broadcast to every connected client
    await writeFile(path.join(projectRoot, 'asset.bin'), 'payload')
  }

  it(
    'broadcasts binary WsSceneMessage first, then the legacy "update" and SCENE_UPDATE text frames',
    async () => {
      const { client, frames } = makeFakeClient()
      sceneUpdateClients.add(client)

      await wire()
      await waitFor(() => frames.length >= 3, DEBOUNCE_MS * 2 + 5000)

      const [first, second, third] = frames

      // 1) new protocol: binary frame, decodable as WsSceneMessage, carrying
      // the b64 sceneId derived from the project root
      expect(first.binary).toBe(true)
      const decoded = WsSceneMessage.decode(first.data as Uint8Array)
      expect(decoded.message).toEqual({ $case: 'updateScene', updateScene: { sceneId: expectedSceneId } })
      // the sceneId is the documented "b64-..." encoding derived from the project root
      expect(expectedSceneId).toMatch(/^b64-/)
      expect(Buffer.from(expectedSceneId.slice('b64-'.length), 'base64').toString('utf-8')).toContain(projectRoot)

      // 2) legacy protocol, frame A: the bare TEXT string "update".
      // Bevy clients key their reload on exactly this frame.
      expect(second.binary).toBe(false)
      expect(second.data).toBe('update')

      // 3) legacy protocol, frame B: the SCENE_UPDATE JSON TEXT frame
      expect(third.binary).toBe(false)
      expect(JSON.parse(third.data as string)).toEqual({
        type: 'SCENE_UPDATE',
        payload: { sceneId: expectedSceneId, sceneType: 'scene' }
      })
    },
    20000
  )
})
