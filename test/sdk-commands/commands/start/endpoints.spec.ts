import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { createFsComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fs'
import { setupEcs6Endpoints } from '../../../../packages/@dcl/sdk-commands/src/commands/start/server/endpoints'

// a real package dir where @dcl/sdk and @dcl/explorer resolve, so the static-file
// routes in setupEcs6Endpoints can register without touching the network
const sdkCommandsDir = path.resolve(__dirname, '../../../../packages/@dcl/sdk-commands')

async function makeEndpoints(projects: any[] = [], componentsFs: any = {}) {
  const fetch = jest.fn()
  const handlers = new Map<string, (ctx: any) => Promise<any>>()
  const capture = (method: string) => (route: string, handler: any) => handlers.set(`${method} ${route}`, handler)
  const router = { get: capture('GET'), post: capture('POST'), all: capture('ALL') }
  const components = {
    fetch: { fetch },
    config: { getString: jest.fn().mockResolvedValue(undefined) },
    fs: componentsFs,
    logger: { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  }
  const workspace = { rootWorkingDirectory: sdkCommandsDir, projects }
  await setupEcs6Endpoints(components as any, router as any, workspace as any)
  return { fetch, handlers }
}

function parcelGrid(width: number, height: number, offsetX = 0): string[] {
  const parcels: string[] = []
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      parcels.push(`${x + offsetX},${y}`)
    }
  }
  return parcels
}

function createSceneProject(workingDirectory: string, parcels: string[]) {
  const scene = { main: 'bin/index.js', scene: { base: parcels[0], parcels } }
  fs.mkdirSync(path.join(workingDirectory, 'bin'), { recursive: true })
  fs.writeFileSync(path.join(workingDirectory, 'scene.json'), JSON.stringify(scene))
  fs.writeFileSync(path.join(workingDirectory, 'bin', 'index.js'), '')
  return { kind: 'scene', workingDirectory, scene }
}

async function readBody(stream: AsyncIterable<Buffer | string>): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

describe('start/server/endpoints', () => {
  it('proxies POST /content/entities to the catalyst without mutating the immutable response headers', async () => {
    const { fetch, handlers } = await makeEndpoints()
    const handler = handlers.get('POST /content/entities')!
    expect(handler).toBeDefined()

    const catalystResponse = new Response('{"creationTimestamp":1}', {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // undici already decompressed the body: these must not be forwarded
        'content-encoding': 'gzip',
        'content-length': '999'
      }
    })
    // real fetch() responses carry immutable Headers (guard "immutable"), unlike
    // constructed ones (guard "response") — mimic that so a mutation regresses loudly
    catalystResponse.headers.delete = () => {
      throw new TypeError('immutable')
    }
    fetch.mockResolvedValue(catalystResponse)

    const response = await handler({ request: { body: 'the-deployment' } })

    // stringMatching instead of the exact URL: catalystUrl.toString() carries a
    // trailing slash on main, so the proxied URL has a pre-existing double slash
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/peer\.decentraland\.org\/+content\/entities$/),
      expect.objectContaining({ method: 'post', body: 'the-deployment', duplex: 'half' })
    )
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('application/json')
    expect(response.headers['content-encoding']).toBeUndefined()
    expect(response.headers['content-length']).toBeUndefined()
    await expect(readBody(response.body)).resolves.toBe('{"creationTimestamp":1}')
  })

  describe('when the preview server is asked for the entities of the requested pointers', () => {
    let tmpDir: string
    let handler: (ctx: any) => Promise<any>

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-commands-endpoints-'))
    })

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    describe('and a single scene covers every requested parcel', () => {
      let parcels: string[]
      let body: any[]

      beforeEach(async () => {
        parcels = parcelGrid(30, 30)
        const { handlers } = await makeEndpoints([createSceneProject(tmpDir, parcels)], createFsComponent())
        handler = handlers.get('POST /content/entities/active')!
        body = (await handler({ request: { json: async () => ({ pointers: parcels }) } })).body
      })

      it('should respond with the scene entity once', () => {
        expect(body).toHaveLength(1)
      })

      it('should respond with an entity that holds every parcel of the scene', () => {
        expect(body[0].pointers).toHaveLength(parcels.length)
      })
    })

    describe('and two scenes with different parcels are requested together', () => {
      let body: any[]

      beforeEach(async () => {
        const firstParcels = parcelGrid(5, 5)
        const secondParcels = parcelGrid(5, 5, 10)
        const projects = [
          createSceneProject(path.join(tmpDir, 'first'), firstParcels),
          createSceneProject(path.join(tmpDir, 'second'), secondParcels)
        ]
        const { handlers } = await makeEndpoints(projects, createFsComponent())
        handler = handlers.get('POST /content/entities/active')!
        body = (await handler({ request: { json: async () => ({ pointers: [...firstParcels, ...secondParcels] }) } }))
          .body
      })

      it('should respond with one entity per scene', () => {
        expect(body).toHaveLength(2)
      })
    })

    describe('and two scenes overlap on a parcel', () => {
      let body: any[]

      beforeEach(async () => {
        const first = ['0,0']
        const second = ['1,0', '0,0']
        const projects = [
          createSceneProject(path.join(tmpDir, 'first'), first),
          createSceneProject(path.join(tmpDir, 'second'), second)
        ]
        const { handlers } = await makeEndpoints(projects, createFsComponent())
        handler = handlers.get('POST /content/entities/active')!
        body = (await handler({ request: { json: async () => ({ pointers: ['1,0', '0,0'] }) } })).body
      })

      it('should emit both scenes in workspace order, letting the first project claim the shared parcel', () => {
        expect(body.map(entity => entity.metadata.scene.base)).toEqual(['0,0', '1,0'])
      })
    })
  })
})
