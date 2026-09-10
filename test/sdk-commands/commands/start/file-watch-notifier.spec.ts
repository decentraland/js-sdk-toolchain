import fs from 'fs'
import os from 'os'
import path from 'path'
import { wireFileWatcherToWebSockets } from '../../../../packages/@dcl/sdk-commands/src/commands/start/server/file-watch-notifier'
import { sceneUpdateClients } from '../../../../packages/@dcl/sdk-commands/src/commands/start/server/routes'
import { createFsComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fs'
import { createEditorWriteTracker } from '../../../../packages/@dcl/sdk-commands/src/logic/editor-write-tracker'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(condition: () => boolean, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  while (!condition() && Date.now() < deadline) await sleep(50)
  return condition()
}

describe('file watch notifier + editor write tracker', () => {
  const components = { fs: createFsComponent(), ws: {} as any, logger: console as any }
  const OPEN = 1 // ws.WebSocket.OPEN; `ws` is a dependency of the package, not resolvable from test/
  const client = { readyState: OPEN, send: jest.fn() }
  const sceneUpdates = () =>
    client.send.mock.calls.filter(([payload]) => typeof payload === 'string' && payload.includes('SCENE_UPDATE'))

  let project: string
  let watcher: Awaited<ReturnType<typeof wireFileWatcherToWebSockets>>

  beforeEach(async () => {
    project = fs.mkdtempSync(path.join(os.tmpdir(), 'dcl-notifier-'))
    fs.mkdirSync(path.join(project, 'assets/scene'), { recursive: true })
    fs.mkdirSync(path.join(project, 'bin'))
    sceneUpdateClients.add(client as any)
  })

  afterEach(async () => {
    await watcher.close()
    sceneUpdateClients.delete(client as any)
    client.send.mockClear()
    fs.rmSync(project, { recursive: true, force: true })
  })

  test('an autosave by the editor and the rebuild it caused are NOT broadcast, an IDE edit still is', async () => {
    const tracker = createEditorWriteTracker()
    watcher = await wireFileWatcherToWebSockets(components, project, 'scene', tracker)
    await new Promise((resolve) => watcher.on('ready', resolve))
    // the initial scan notifies once; let that settle so only our writes count
    await sleep(1200)
    client.send.mockClear()

    // the data layer saves the composite (see data-layer/fs.ts) and the bundler
    // rebuilds from it (see logic/bundle.ts): every one of those writes is marked
    const composite = path.join(project, 'assets/scene/main.composite')
    const outputs = [path.join(project, 'bin/index.js'), path.join(project, 'main.crdt')]
    tracker.markEditorWrite(composite)
    fs.writeFileSync(composite, '{}')
    tracker.markRebuildOutputs([composite], outputs)
    for (const output of outputs) fs.writeFileSync(output, 'built')
    await sleep(1500)
    expect(sceneUpdates()).toHaveLength(0)

    // a change nobody marked (an asset dropped in from the file system) is broadcast
    fs.writeFileSync(path.join(project, 'assets/readme.txt'), 'hello')
    expect(await waitFor(() => sceneUpdates().length > 0, 3000)).toBe(true)
  })

  test('without a tracker every change is broadcast, as before', async () => {
    watcher = await wireFileWatcherToWebSockets(components, project, 'scene')
    await new Promise((resolve) => watcher.on('ready', resolve))
    await sleep(1200)
    client.send.mockClear()

    fs.writeFileSync(path.join(project, 'assets/scene/main.composite'), '{}')
    expect(await waitFor(() => sceneUpdates().length > 0, 3000)).toBe(true)
  })
})
