import {
  Composite,
  compositeFromBinary,
  compositeFromJson,
  CompositeProvider,
  compositeToBinary,
  compositeToJson
} from '@dcl/ecs'
import { FileSystemInterface } from '../types'

export type CompositeManager = CompositeProvider & {
  save: (composite: Composite, type: 'json' | 'binary') => Promise<void>
}

export async function createFsCompositeProvider(fs: FileSystemInterface): Promise<CompositeManager> {
  const compositePaths = (await fs.getDirectoryFiles('')).filter(
    (item) => item.endsWith('.composite.json') || item.endsWith('.composite')
  )

  const compositePromises = compositePaths.map(async (itemPath) => {
    try {
      if (itemPath.endsWith('.json')) {
        const compositeContent = await fs.readFile<string>(itemPath, 'string')
        const json = JSON.parse(compositeContent)
        const composite = compositeFromJson(json)
        return {
          filePath: itemPath,
          composite
        }
      } else {
        const compositeContent = await fs.readFile<Uint8Array>(itemPath, 'uint8array')
        const composite = compositeFromBinary(compositeContent)
        return {
          filePath: itemPath,
          composite
        }
      }
    } catch (err) {
      console.error(`Error loading composite ${itemPath}: ${(err as any).toString()}`)
      return null
    }
  })

  const composites = (await Promise.all(compositePromises)).filter((item) => item)

  return {
    getCompositeOrNull(id: string) {
      return composites.find((item) => item?.composite.id === id)?.composite || null
    },
    // a lot of questions with this method, it's temporal
    // => what should they be the params?, it overides? it's a save&replace, save as..., etc
    save: async (composite: Composite, type: 'json' | 'binary') => {
      const oldComposite = composites.find((item) => item?.composite.id === composite.id)
      if (oldComposite?.filePath) {
        if (type === 'binary') {
          await fs.writeFile(oldComposite.filePath, compositeToBinary(composite))
        } else {
          await fs.writeFile(oldComposite.filePath, JSON.stringify(compositeToJson(composite), null, 2))
        }
      }
    }
  }
}
