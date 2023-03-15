import { CompositeProvider, Composite, compositeFromBinary, compositeFromJson } from '@dcl/ecs'
import { getSceneInfo } from '~system/Scene'

// @public
export async function createContentFetchCompositeProvider(): Promise<CompositeProvider> {
  const scene = await getSceneInfo({})
  const compositesContent = scene.contents.filter((item) => {
    const path = item.file.toLowerCase()
    return path.endsWith('.composite') || path.endsWith('.composite.json')
  })

  const compositePromises = compositesContent.map(async (item) => {
    const compositeUrl = `${scene.baseUrl}${item.hash}`
    try {
      const response = await fetch(compositeUrl)
      if (item.file.endsWith('.json')) {
        const compositeJson = await response.json()
        const composite = compositeFromJson(compositeJson)
        return composite
      } else {
        const compositeBinaryData: Uint8Array = await (response as any).arrayBuffer()
        const composite = compositeFromBinary(compositeBinaryData)
        return null
      }
    } catch (err) {
      console.error(`Error loading composite ${compositeUrl}: ${(err as any).toString()}`)
      return null
    }
  })

  const composites = (await Promise.all(compositePromises)).filter((item) => !!item) as Composite[]

  return {
    getCompositeOrNull(id: string) {
      return composites.find((item) => item.id === id) || null
    }
  }
}
