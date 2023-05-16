import { compositeFromLoader } from '~sdk/all-composites'
import { Composite } from '@dcl/ecs'

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
  }
}
