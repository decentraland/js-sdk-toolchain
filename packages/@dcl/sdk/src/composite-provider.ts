import { compositeFromLoader } from '~sdk/all-composites'
import { readFile } from '~system/Runtime'
import { Composite } from '@dcl/ecs'
import { decodeUtf8 } from './internal/utf8'

const composites = new Map<string, Composite.Resource>()

function findCached(src: string): Composite.Resource | null {
  return composites.get(src) ?? null
}

function cache(src: string, composite: Composite.Definition): Composite.Resource {
  const existing = findCached(src)
  if (existing) return existing
  const resource: Composite.Resource = { src, composite }
  composites.set(src, resource)
  return resource
}

function decodeFromLoader(src: string, fromLoader: unknown): Composite.Definition | null {
  if (fromLoader instanceof Uint8Array) return Composite.fromBinary(fromLoader)
  if (typeof fromLoader === 'string') return Composite.fromJson(JSON.parse(fromLoader))
  if (typeof fromLoader === 'object' && fromLoader !== null) return Composite.fromJson(fromLoader)
  return null
}

function decodeFromBytes(content: Uint8Array): Composite.Definition {
  // .composite files are JSON (UTF-8); .composite.bin files are protobuf binary.
  // The first-byte check is a fast path; a JSON.parse failure falls back to fromBinary
  // because a protobuf message can also begin with 0x7b.
  if (content[0] === 0x7b /* '{' */) {
    try {
      return Composite.fromJson(JSON.parse(decodeUtf8(content, { fatal: true })))
    } catch {
      return Composite.fromBinary(content)
    }
  }
  return Composite.fromBinary(content)
}

// @public
export const compositeProvider: Composite.Provider = {
  schemas: [],
  getCompositeOrNull(src: string) {
    const fromLoader = compositeFromLoader[src]
    if (fromLoader) {
      try {
        const composite = decodeFromLoader(src, fromLoader)
        if (composite) cache(src, composite)
      } catch (err) {
        console.error(`compositeProvider: failed to decode composite "${src}"`, err)
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
