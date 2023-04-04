import { Composite } from '@dcl/ecs'
import { getSceneInfo } from '~system/Scene'

// @public
export async function createContentFetchCompositeProvider(): Promise<Composite.Provider> {
  const scene = await getSceneInfo({})
  const compositesContent = scene.contents.filter((item) => {
    const path = item.file.toLowerCase()
    return path.endsWith('.composite') || path.endsWith('.composite.json')
  })

  async function fetchComposite(item: { hash: string; file: string }): Promise<Composite.Resource | null> {
    const src = item.file.toLowerCase()
    const compositeUrl = `${scene.baseUrl}${item.hash}`
    try {
      const response = await fetch(compositeUrl)
      if (item.file.endsWith('.json')) {
        const compositeJson = await response.json()
        const composite = Composite.fromJson(compositeJson)
        return { src, composite }
      } else {
        const compositeBinaryData: Uint8Array = await (response as any).arrayBuffer()
        const composite = Composite.fromBinary(compositeBinaryData)
        return { src, composite }
      }
    } catch (err) {
      console.error(`Error loading composite ${compositeUrl}: ${(err as any).toString()}`)
      return null
    }
  }

  const compositePromises = compositesContent.map(fetchComposite)

  const composites = (await Promise.all(compositePromises)).filter((item) => !!item) as Composite.Resource[]

  return {
    getCompositeOrNull(src: string, currentPath?: string) {
      // TODO: resolve path from src and currentPath

      return composites.find((item) => item.src === src) || null
    }
  }
}
