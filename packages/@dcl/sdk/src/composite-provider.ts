import { compositeFromLoader } from '~sdk/all-composites'
import { readFile } from '~system/Runtime'
import { Composite, getGlobal } from '@dcl/ecs'

const composites: Composite.Resource[] = []

function findCached(src: string): Composite.Resource | null {
  return composites.find((item) => item.src === src) || null
}

function cache(src: string, composite: Composite.Definition): Composite.Resource {
  const existing = findCached(src)
  if (existing) return existing
  const resource: Composite.Resource = { src, composite }
  composites.push(resource)
  return resource
}

function decodeFromLoader(src: string, fromLoader: unknown): Composite.Definition | null {
  if (fromLoader instanceof Uint8Array) return Composite.fromBinary(fromLoader)
  if (typeof fromLoader === 'string') return Composite.fromJson(JSON.parse(fromLoader))
  if (typeof fromLoader === 'object' && fromLoader !== null) return Composite.fromJson(fromLoader)
  return null
}

function decodeFromBytes(content: Uint8Array): Composite.Definition {
  // .composite files are JSON (UTF-8); .composite.bin files are protobuf binary
  if (content[0] === 0x7b /* '{' = JSON */) {
    const TD = getGlobal<new () => { decode(input: Uint8Array): string }>('TextDecoder')
    if (!TD) {
      throw new Error(
        'loadComposite: TextDecoder is not available in this runtime. ' +
          'Use a .composite.bin file, or import `@dcl/sdk/ethereum-provider` ' +
          'to install the TextEncoder/TextDecoder polyfill.'
      )
    }
    return Composite.fromJson(JSON.parse(new TD().decode(content)))
  }
  return Composite.fromBinary(content)
}

// @public
export const compositeProvider: Composite.Provider = {
  getCompositeOrNull(src: string, _currentPath?: string) {
    // TODO: resolve path from src and currentPath

    const fromLoader = compositeFromLoader[src]
    if (fromLoader) {
      try {
        const composite = decodeFromLoader(src, fromLoader)
        if (composite) cache(src, composite)
      } catch (err) {
        console.error(err)
      }
      delete compositeFromLoader[src]
    }

    return findCached(src)
  },

  async loadComposite(src: string): Promise<Composite.Resource> {
    const cached = findCached(src)
    if (cached) return cached

    const { content } = await readFile({ fileName: src })
    const composite = decodeFromBytes(content)
    return cache(src, composite)
  }
}
