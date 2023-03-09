import { getSceneInfo } from '~system/Scene'
import { Entity } from '../engine/entity'
import { Composite, CompositeProvider } from './types'

// function compositeFromBinary(binaryComposite: Uint8Array): Composite {
//   throw new Error('To implement')
// }

function compositeFromJson(jsonComposite: any): Composite {
  if (!jsonComposite) throw new Error('Composite is not well defined')
  if (!jsonComposite.id || typeof jsonComposite.id !== 'string')
    throw new Error("Composite doesn't have a valid `id` field")

  const compositeId: string = jsonComposite.id

  // TODO: Should be there a .version to identify the schema version?

  if (!jsonComposite.components) throw new Error(`Composite ${compositeId} doesn't have \`components\` field`)
  if (!Array.isArray(jsonComposite.components))
    throw new Error(`Composite ${compositeId} fields \`components\` is not an array`)

  const composite: Composite = {
    id: compositeId,
    components: []
  }

  for (const component of jsonComposite.components) {
    if (!component.name || typeof component.name !== 'string')
      throw new Error("Composite ${compositeId}: The component doesn't have a valid name")
    const componentName = component.name
    const componentData: Map<Entity, any> = new Map()

    if (typeof component.data !== 'object' || Array.isArray(component.data))
      throw new Error(`Composite ${compositeId}: Invalid data in component ${component.name}`)
    for (const [entityStr, data] of Object.entries(component.data)) {
      const entity = parseInt(entityStr) as Entity
      componentData.set(entity, data)
    }

    composite.components.push({
      name: componentName,
      data: componentData,
      schema: component.schema
    })
  }

  return composite
}

// @internal
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
        // TODO: fetch doesn't have arrayBuffer()
        // const compositeBinaryData = await response.text()

        // TODO: implement compositeFromBinary
        // const composite = compositeFromBinary(compositeBinaryData)

        return null
      }
    } catch (err) {
      console.error(`Error loading composite ${compositeUrl}: ${(err as any).toString()}`)
      return null
    }
  })

  const composites = (await Promise.all(compositePromises)).filter((item) => item !== null) as Composite[]

  return {
    getCompositeOrNull(id: string) {
      return composites.find((item) => item.id === id) || null
    }
  }
}
