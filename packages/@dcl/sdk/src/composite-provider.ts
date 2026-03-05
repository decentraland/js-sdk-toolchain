import { compositeFromLoader } from '~sdk/all-composites'
import { readFile } from '~system/Runtime'
import { Composite } from '@dcl/ecs'
import { polyfillTextEncoder } from './ethereum-provider/text-encoder'

const composites: Composite.Resource[] = []

// @public
export const compositeProvider: Composite.Provider = {
  getCompositeOrNull(src: string, _currentPath?: string) {
    // TODO: resolve path from src and currentPath

    const fromLoader = compositeFromLoader[src]
    if (fromLoader) {
      try {
        if (fromLoader instanceof Uint8Array) {
          const composite = Composite.fromBinary(fromLoader)
          composites.push({ src, composite })
        } else if (typeof fromLoader === 'string') {
          const composite = Composite.fromJson(JSON.parse(fromLoader))
          composites.push({ src, composite })
        } else if (typeof fromLoader === 'object') {
          const composite = Composite.fromJson(fromLoader)
          composites.push({ src, composite })
        }
      } catch (err) {
        console.error(err)
      }

      delete compositeFromLoader[src]
    }

    return composites.find((item) => item.src === src) || null
  },

  async loadComposite(src: string): Promise<Composite.Resource> {
    const { content } = await readFile({ fileName: src })

    // .composite files are JSON (UTF-8); .composite.bin files are protobuf binary
    let composite: Composite.Definition
    if (content[0] === 0x7b /* '{' = JSON */) {
      polyfillTextEncoder()
      const TextDecoderCtor = (globalThis as any).TextDecoder as new () => { decode(input: Uint8Array): string }
      composite = Composite.fromJson(JSON.parse(new TextDecoderCtor().decode(content)))
    } else {
      composite = Composite.fromBinary(content)
    }

    const resource: Composite.Resource = { src, composite }
    composites.push(resource)
    return resource
  }
}
