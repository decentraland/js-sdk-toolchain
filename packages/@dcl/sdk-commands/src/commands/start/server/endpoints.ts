import { Router } from '@well-known-components/http-server'
import { PreviewComponents } from '../types'
import * as path from 'path'
import { WearableJson } from '@dcl/schemas/dist/sdk'
import { Entity, EntityType, Locale, Wearable } from '@dcl/schemas'
import fetch, { Headers } from 'node-fetch'
import { fetchEntityByPointer } from '../../../logic/catalyst-requests'
import { CliComponents } from '../../../components'
import { b64HashingFunction, getProjectContentMappings } from '../../../logic/project-files'
import { getCatalystBaseUrl } from '../../../logic/config'

function smartWearableNameToId(name: string) {
  return name.toLocaleLowerCase().replace(/ /g, '-')
}

type LambdasWearable = Wearable & {
  baseUrl: string
}

export async function setupEcs6Endpoints(components: CliComponents, dir: string, router: Router<PreviewComponents>) {
  const catalystUrl = new URL(await getCatalystBaseUrl(components))

  const baseFolders = [dir]
  // handle old preview scene.json
  router.get('/scene.json', async () => {
    return {
      headers: { 'content-type': 'application/json' },
      body: components.fs.createReadStream(path.join(dir, 'scene.json'))
    }
  })

  router.get('/lambdas/explore/realms', async (ctx) => {
    return {
      body: [
        {
          serverName: 'localhost',
          url: `http://${ctx.url.host}`,
          layer: 'stub',
          usersCount: 0,
          maxUsers: 100,
          userParcels: []
        }
      ]
    }
  })

  router.get('/lambdas/contracts/servers', async (ctx) => {
    return {
      body: [
        {
          address: `http://${ctx.url.host}`,
          owner: '0x0000000000000000000000000000000000000000',
          id: '0x0000000000000000000000000000000000000000000000000000000000000000'
        }
      ]
    }
  })

  router.get('/lambdas/profiles', async (ctx, next) => {
    const baseUrl = `${ctx.url.protocol}//${ctx.url.host}/content/contents`

    try {
      const previewWearables = await getAllPreviewWearables(components, {
        baseFolders,
        baseUrl
      })

      if (previewWearables.length === 1) {
        const u = new URL(ctx.url.toString())
        u.host = catalystUrl.host
        u.protocol = catalystUrl.protocol
        u.port = catalystUrl.port
        const req = await fetch(u.toString(), {
          headers: {
            connection: 'close'
          },
          method: ctx.request.method,
          body: ctx.request.method === 'get' ? undefined : ctx.request.body
        })

        const deployedProfile = (await req.json()) as any[]

        if (deployedProfile?.length === 1) {
          deployedProfile[0].avatars[0].avatar.wearables.push(...previewWearables.map(($) => $.id))
          return {
            headers: {
              'content-type': req.headers.get('content-type') || 'application/binary'
            },
            body: deployedProfile
          }
        }
      }
    } catch (err: any) {
      components.logger.warn(`Failed to catch profile and fill with preview wearables.`)
      components.logger.error(err)
    }

    return next()
  })

  router.all('/lambdas/:path+', async (ctx) => {
    const u = new URL(ctx.url.toString())
    u.host = catalystUrl.host
    u.protocol = catalystUrl.protocol
    u.port = catalystUrl.port
    const req = await fetch(u.toString(), {
      headers: {
        connection: 'close'
      },
      method: ctx.request.method,
      body: ctx.request.method === 'get' ? undefined : ctx.request.body
    })

    return {
      headers: {
        'content-type': req.headers.get('content-type') || 'application/binary'
      },
      body: req.body
    }
  })

  router.post('/content/entities', async (ctx) => {
    const headers = new Headers()
    const res = await fetch(`${catalystUrl.toString()}/content/entities`, {
      method: 'post',
      headers,
      body: ctx.request.body
    })

    return res
  })

  serveStatic(components, dir, router)

  // TODO: get workspace scenes & wearables...

  await serveFolders(components, router, baseFolders)
}

async function serveFolders(
  components: Pick<CliComponents, 'fs' | 'logger' | 'fetch' | 'config'>,
  router: Router<PreviewComponents>,
  baseFolders: string[]
) {
  const catalystUrl = await getCatalystBaseUrl(components)

  router.get('/content/contents/:hash', async (ctx: any, next: any) => {
    if (ctx.params.hash && ctx.params.hash.startsWith('b64-')) {
      const fullPath = path.resolve(Buffer.from(ctx.params.hash.replace(/^b64-/, ''), 'base64').toString('utf8'))

      // only return files IF the file is within a baseFolder
      if (!baseFolders.find((folder: string) => fullPath.startsWith(folder))) {
        return next()
      }

      return {
        headers: {
          'x-timestamp': Date.now(),
          'x-sent': true,
          'cache-control': 'no-cache,private,max-age=1'
        },
        body: components.fs.createReadStream(fullPath)
      }
    }

    return next()
  })

  async function pointerRequestHandler(pointers: string[]) {
    if (!pointers || pointers.length === 0) {
      return []
    }

    const requestedPointers = new Set<string>(
      pointers && typeof pointers === 'string' ? [pointers as string] : (pointers as string[])
    )

    const resultEntities = await getSceneJson(components, baseFolders, Array.from(requestedPointers))
    const remote = fetchEntityByPointer(
      components,
      catalystUrl.toString(),
      pointers.filter(($: string) => !$.match(/-?\d+,-?\d+/))
    )

    const serverEntities = Array.isArray(remote) ? remote : []

    return [...resultEntities, ...serverEntities]
  }

  // REVIEW RESPONSE FORMAT
  router.get('/content/entities/scene', async (ctx) => {
    return {
      body: await pointerRequestHandler(ctx.url.searchParams.getAll('pointer'))
    }
  })

  // REVIEW RESPONSE FORMAT
  router.post('/content/entities/active', async (ctx) => {
    const body = await ctx.request.json()
    return {
      body: await pointerRequestHandler(body.pointers)
    }
  })

  router.get('/preview-wearables/:id', async (ctx) => {
    const baseUrl = `${ctx.url.protocol}//${ctx.url.host}/content/contents`
    const wearables = await getAllPreviewWearables(components, {
      baseUrl,
      baseFolders
    })
    const wearableId = ctx.params.id
    return {
      body: {
        ok: true,
        data: wearables.filter((wearable) => smartWearableNameToId(wearable?.name) === wearableId)
      }
    }
  })

  router.get('/preview-wearables', async (ctx) => {
    const baseUrl = `${ctx.url.protocol}//${ctx.url.host}/content/contents`
    return {
      body: {
        ok: true,
        data: await getAllPreviewWearables(components, { baseUrl, baseFolders })
      }
    }
  })
}

async function getAllPreviewWearables(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  { baseFolders, baseUrl }: { baseFolders: string[]; baseUrl: string }
) {
  const wearablePathArray: string[] = []
  for (const wearableDir of baseFolders) {
    const wearableJsonPath = path.resolve(wearableDir, 'wearable.json')
    if (await components.fs.fileExists(wearableJsonPath)) {
      wearablePathArray.push(wearableJsonPath)
    }
  }

  const ret: LambdasWearable[] = []
  for (const wearableJsonPath of wearablePathArray) {
    try {
      ret.push(await serveWearable(components, wearableJsonPath, baseUrl))
    } catch (err) {
      components.logger.error(
        `Couldn't mock the wearable ${wearableJsonPath}. Please verify the correct format and scheme.` + err
      )
    }
  }
  return ret
}

async function serveWearable(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  wearableJsonPath: string,
  baseUrl: string
): Promise<LambdasWearable> {
  const wearableDir = path.dirname(wearableJsonPath)
  const wearableJson = JSON.parse((await components.fs.readFile(wearableJsonPath)).toString())

  if (!WearableJson.validate(wearableJson)) {
    const errors = (WearableJson.validate.errors || []).map((a) => `${a.data} ${a.message}`).join('')

    components.logger.error(`Unable to validate wearable.json properly, please check it.` + errors)
    throw new Error(`Invalid wearable.json (${wearableJsonPath})`)
  }

  const hashedFiles = await getProjectContentMappings(components, wearableDir, b64HashingFunction)

  const thumbnailFiltered = hashedFiles.filter(($) => $?.file === 'thumbnail.png')
  const thumbnail =
    thumbnailFiltered.length > 0 && thumbnailFiltered[0]?.hash && `${baseUrl}/${thumbnailFiltered[0].hash}`

  const wearableId = 'urn:8dc2d7ad-97e3-44d0-ba89-e8305d795a6a'

  const representations = wearableJson.data.representations.map((representation) => ({
    ...representation,
    mainFile: `male/${representation.mainFile}`,
    contents: hashedFiles.map(($) => ({
      key: `male/${$?.file}`,
      url: `${baseUrl}/${$?.hash}`,
      hash: $?.hash
    }))
  }))

  return {
    id: wearableId,
    rarity: wearableJson.rarity,
    i18n: [{ code: 'en' as Locale, text: wearableJson.name }],
    description: wearableJson.description,
    thumbnail: thumbnail || '',
    image: thumbnail || '',
    collectionAddress: '0x0',
    baseUrl: `${baseUrl}/`,
    name: wearableJson.name || '',
    data: {
      category: wearableJson.data.category,
      replaces: [],
      hides: [],
      tags: [],
      representations: representations as any
      // scene: hashedFiles as any,
    }
  }
}

async function getSceneJson(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectRoots: string[],
  pointers: string[]
): Promise<Entity[]> {
  const requestedPointers = new Set<string>(pointers)
  const resultEntities: Entity[] = []

  const allDeployments = await Promise.all(
    projectRoots.map(async (projectRoot) => fakeEntityV3FromFolder(components, projectRoot, b64HashingFunction))
  )

  for (const pointer of Array.from(requestedPointers)) {
    // get deployment by pointer
    const theDeployment = allDeployments.find(($) => $ && $.pointers.includes(pointer))
    if (theDeployment) {
      // remove all the required pointers from the requestedPointers set
      // to prevent sending duplicated entities
      theDeployment.pointers.forEach(($) => requestedPointers.delete($))

      // add the deployment to the results
      resultEntities.push(theDeployment)
    }
  }

  return resultEntities
}

function serveStatic(components: Pick<CliComponents, 'fs'>, projectRoot: string, router: Router<PreviewComponents>) {
  const sdkPath = path.dirname(
    require.resolve('@dcl/sdk/package.json', {
      paths: [projectRoot]
    })
  )
  const dclExplorerJsonPath = path.dirname(
    require.resolve('@dcl/explorer/package.json', {
      paths: [projectRoot, sdkPath]
    })
  )

  const dclKernelDefaultProfilePath = path.resolve(dclExplorerJsonPath, 'default-profile')
  const dclKernelImagesDecentralandConnect = path.resolve(dclExplorerJsonPath, 'images', 'decentraland-connect')

  const routes = [
    {
      route: '/',
      path: path.resolve(dclExplorerJsonPath, 'preview.html'),
      type: 'text/html'
    },
    {
      route: '/favicon.ico',
      path: path.resolve(dclExplorerJsonPath, 'favicon.ico'),
      type: 'text/html'
    },
    {
      route: '/@/explorer/index.js',
      path: path.resolve(dclExplorerJsonPath, 'index.js'),
      type: 'text/javascript'
    }
  ]

  for (const route of routes) {
    router.get(route.route, async (_ctx) => {
      return {
        headers: { 'Content-Type': route.type },
        body: components.fs.createReadStream(route.path)
      }
    })
  }

  function createStaticRoutes(
    components: Pick<CliComponents, 'fs'>,
    route: string,
    folder: string,
    transform = (str: string) => str
  ) {
    router.get(route, async (ctx, next) => {
      const file = ctx.params.path
      const fullPath = path.resolve(folder, transform(file))

      // only return files IF the file is within a baseFolder
      if (!(await components.fs.fileExists(fullPath))) {
        return next()
      }

      const headers: Record<string, any> = {
        'x-timestamp': Date.now(),
        'x-sent': true,
        'cache-control': 'no-cache,private,max-age=1'
      }

      if (fullPath.endsWith('.wasm')) {
        headers['content-type'] = 'application/wasm'
      }

      return {
        headers,
        body: components.fs.createReadStream(fullPath)
      }
    })
  }

  createStaticRoutes(components, '/images/decentraland-connect/:path+', dclKernelImagesDecentralandConnect)
  createStaticRoutes(components, '/default-profile/:path+', dclKernelDefaultProfilePath)
  createStaticRoutes(components, '/@/explorer/:path+', dclExplorerJsonPath, (filePath) => filePath.replace(/.br+$/, ''))

  router.get('/feature-flags/:file', async (ctx) => {
    const res = await fetch(`https://feature-flags.decentraland.zone/${ctx.params.file}`, {
      headers: {
        connection: 'close'
      }
    })
    return {
      body: await res.arrayBuffer()
    }
  })
}

async function fakeEntityV3FromFolder(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectRoot: string,
  hashingFunction: (filePath: string) => Promise<string>
): Promise<Entity | null> {
  const sceneJsonPath = path.resolve(projectRoot, 'scene.json')
  let isParcelScene = true

  const wearableJsonPath = path.resolve(projectRoot, 'wearable.json')
  if (await components.fs.fileExists(wearableJsonPath)) {
    try {
      const wearableJson = JSON.parse(await components.fs.readFile(wearableJsonPath, 'utf-8'))
      if (!WearableJson.validate(wearableJson)) {
        const errors = (WearableJson.validate.errors || []).map((a) => `${a.data} ${a.message}`).join('')

        components.logger.error(`Unable to validate wearable.json properly, please check its schema.` + errors)
        components.logger.error(`Invalid wearable.json (${wearableJsonPath})`)
      } else {
        isParcelScene = false
      }
    } catch (err: any) {
      components.logger.error(`Unable to load wearable.json`)
      components.logger.error(err)
    }
  }

  if ((await components.fs.fileExists(sceneJsonPath)) && isParcelScene) {
    const sceneJson = JSON.parse(await components.fs.readFile(sceneJsonPath, 'utf-8'))
    const { base, parcels }: { base: string; parcels: string[] } = sceneJson.scene
    const pointers = new Set<string>()
    pointers.add(base)
    parcels.forEach(($) => pointers.add($))

    const mappedFiles = await getProjectContentMappings(components, projectRoot, hashingFunction)

    return {
      version: 'v3',
      type: EntityType.SCENE,
      id: await hashingFunction(projectRoot),
      pointers: Array.from(pointers),
      timestamp: Date.now(),
      metadata: sceneJson,
      content: mappedFiles
    }
  }

  return null
}
