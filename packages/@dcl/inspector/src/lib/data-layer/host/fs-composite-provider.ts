import { Composite } from '@dcl/ecs'
import { FileSystemInterface } from '../types'
import { getFilesInDirectory } from './fs-utils'

export type CompositeManager = Composite.Provider & {
  save: (composite: Composite.Resource, type: 'json' | 'binary') => Promise<void>
}

export async function createFsCompositeProvider(fs: FileSystemInterface): Promise<CompositeManager> {
  const compositePaths = (await getFilesInDirectory(fs, '', [], true))
    .filter((item) => item.endsWith('.composite.json') || item.endsWith('.composite'))
    .map((item) => item)

  const compositePromises = compositePaths.map(async (itemPath) => {
    const src = itemPath.toLowerCase()
    try {
      if (itemPath.endsWith('.json')) {
        const compositeContent = (await fs.readFile(itemPath)).toString()
        const json = JSON.parse(compositeContent)
        const composite = Composite.fromJson(json)
        return {
          src,
          composite
        }
      } else {
        const compositeContent = new Uint8Array(await fs.readFile(itemPath))
        const composite = Composite.fromBinary(compositeContent)
        return {
          src,
          composite
        }
      }
    } catch (err) {
      console.error(`Error loading composite ${itemPath}: ${(err as any).toString()}`)
      return null
    }
  })

  const composites = (await Promise.all(compositePromises)).filter((item) => item) as Composite.Resource[]

  return {
    getCompositeOrNull(src: string, _currentPath?: string) {
      return composites.find((item) => item.src === src) || null
    },
    // a lot of questions with this method, it's temporal
    // => what should they be the params?, it overides? it's a save&replace, save as..., etc
    save: async (composite: Composite.Resource, type: 'json' | 'binary') => {
      if (type === 'binary') {
        await fs.writeFile(composite.src, Buffer.from(Composite.toBinary(composite.composite)))
      } else {
        await fs.writeFile(
          composite.src,
          Buffer.from(JSON.stringify(Composite.toJson(composite.composite), null, 2), 'utf-8')
        )
      }
    }
  }
}
