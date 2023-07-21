import { Composite } from '@dcl/ecs'
import { getFilesInDirectory } from '../fs-utils'
import { FileSystemInterface } from '../../types'

export type CompositeManager = Composite.Provider & {
  save: (composite: Composite.Resource, type: 'json' | 'binary') => Promise<void>
}

export async function createFsCompositeProvider(
  fs: FileSystemInterface,
  dirPath: string = ''
): Promise<CompositeManager> {
  const files = await getFilesInDirectory(fs, dirPath, [], true, ['node_modules', 'dist', 'bin', 'src', '.vscode'])
  const compositePaths = files
    .filter((item) => item.endsWith('.composite') || item.endsWith('.composite.bin'))
    .map((item) => fs.join(fs.dirname(item), fs.basename(item).toLowerCase()))

  const compositePromises = compositePaths.map(async (itemPath) => {
    try {
      if (itemPath.endsWith('.bin')) {
        const compositeContent = new Uint8Array(await fs.readFile(itemPath))
        const composite = Composite.fromBinary(compositeContent)
        return {
          src: itemPath,
          composite
        }
      } else {
        const compositeContent = new TextDecoder().decode(await fs.readFile(itemPath))
        const json = JSON.parse(compositeContent)
        const composite = Composite.fromJson(json)
        return {
          src: itemPath,
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
      // compositePaths uses fs.join() to generate the .composite file and in windows generates paths like assets\\main.composite
      // and the src: string parameter has assets/main.composite path.
      function normalizePath(val: string) {
        return val.replace(/\\/g, '/').toLocaleLowerCase()
      }
      return composites.find((item) => normalizePath(item.src) === normalizePath(src)) || null
    },
    // a lot of questions with this method, it's temporal
    // => what should they be the params?, it overides? it's a save&replace, save as..., etc
    save: async (composite: Composite.Resource, type: 'json' | 'binary') => {
      let compositeDefinition: Composite.Definition
      if (type === 'binary') {
        const bytes = Buffer.from(Composite.toBinary(composite.composite))
        await fs.writeFile(composite.src, bytes)

        // deep clone (*)
        compositeDefinition = Composite.fromBinary(bytes)
      } else {
        const text = JSON.stringify(Composite.toJson(composite.composite), null, 2)
        await fs.writeFile(composite.src, Buffer.from(text, 'utf-8'))

        // deep clone (*)
        compositeDefinition = Composite.fromJson(JSON.parse(text))
      }

      // (*) deep clone: the `composite.composite` could be used, but this would assign
      // the reference and at this point we don't have control about it

      // If the composite resource exists in our list, we replaced the definition
      //  with a cloned definition
      const existingComposite = composites.find((item) => item.src === composite.src)
      if (existingComposite) {
        existingComposite.composite = compositeDefinition
      }
    }
  }
}
