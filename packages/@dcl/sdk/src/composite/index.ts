import { Entity, engine, LastWriteWinElementSetComponentDefinition, Transform, TransformType } from '@dcl/ecs'
import { CompositeRoot } from './components'
import { jsonSchemaToSchema } from '@dcl/ecs/src/schemas/buildSchema'
import { Composite, CompositeProvider } from './types'
import { getComponentFromNameOrNull } from './temp'

/**
 * Return the entity mapping or fail if there is no more
 */
function getEntityMapping(
  compositeEntity: Entity,
  mappedEntities: Map<Entity, Entity>,
  getNextAvailableEntity: () => Entity | null
): Entity {
  const existingEntity = mappedEntities.get(compositeEntity)
  if (existingEntity) {
    return existingEntity
  }

  // This function in runtime can be just `engine.addEntity()`
  const newEntity = getNextAvailableEntity()
  if (newEntity === null) {
    throw new Error('There is no more entities to allocate')
  }

  mappedEntities.set(compositeEntity, newEntity)
  return newEntity
}

/**
 * Instance a composite and returns its root entity
 * @param compositeData state serialized by the CRDT protocol
 * @param getNextAvailableEntity function that gives unused entities
 * @param rootEntity (optional) suggested mapped rootEntity for the composite
 */
export function instanceComposite(
  compositeData: Composite,
  getNextAvailableEntity: () => Entity | null,
  compositeProvider: CompositeProvider,
  rootEntity?: Entity
) {
  // Key => EntityNumber from the composite
  // Value => EntityNumber in current engine
  const mappedEntities: Map<Entity, Entity> = new Map()
  const getCompositeEntity = (compositeEntity: Entity | number) =>
    getEntityMapping(compositeEntity as Entity, mappedEntities, getNextAvailableEntity)

  // ## 1 ##
  // First entity that I want to map, the root entity from the composite to the target entity in the engine
  // If there is no `rootEntity` passed, we assign one from `getNextAvailableEntity`
  const compositeRootEntity = rootEntity ?? getCompositeEntity(0)
  if (rootEntity) {
    mappedEntities.set(0 as Entity, rootEntity)
  }

  // ## 2 ##
  // If there are more composite inside this one, we instance first.
  // => This is not only a copy, we need to instance.
  // => Other reason for composite instanciation first is the overides. If we instance first and then load the component, the override
  const childrenComposite = compositeData.components.find((item) => item.name === CompositeRoot.componentName)
  if (childrenComposite) {
    for (const [entity, childComposite] of childrenComposite.data) {
      const compositeRoot = childComposite as ReturnType<typeof CompositeRoot['create']>
      const composite = compositeProvider.getCompositeOrNull(compositeRoot.id)
      if (composite) {
        instanceComposite(composite, getNextAvailableEntity, compositeProvider, entity)
      }
    }
  }

  // ## 3 ##
  // Then, we copy the all rest of the components (skipping the Composite ones)
  for (const component of compositeData.components) {
    // We already instanced the composite
    if (component.name === CompositeRoot.componentName) continue

    // ## 3a ##
    // We find the component definition
    let componentDefinition
    const existingComponentDefinition = getComponentFromNameOrNull(component.name)

    if (!existingComponentDefinition) {
      if (!component.schema) {
        throw new Error(`${component.name} is not defined and there is no schema to define it.`)
      }
      componentDefinition = engine.defineComponentFromSchema(component.name, jsonSchemaToSchema(component.schema))
    } else {
      componentDefinition = existingComponentDefinition as LastWriteWinElementSetComponentDefinition<unknown>
    }

    // ## 3b ##
    // Iterating over all the entities with this component and create the replica
    for (const [entity, compositeComponentValue] of component.data) {
      const targetEntity = getCompositeEntity(entity)
      const componentValue = componentDefinition.create(targetEntity, compositeComponentValue)

      // ## 3c ##
      // All entities referenced in the composite probably has a different resolved EntityNumber
      // We'll know with the mappedEntityes
      if (Transform.componentId === componentDefinition.componentId) {
        const transform = componentValue as TransformType
        if (transform.parent) {
          transform.parent = getCompositeEntity(transform.parent)
        }
      } else {
        // TODO: with static reflection, look for `Schema.Entity` in custom components
      }
    }
  }

  const composite = CompositeRoot.getMutableOrNull(compositeRootEntity) || CompositeRoot.create(compositeRootEntity)
  for (const [entitySource, targetEntity] of mappedEntities) {
    composite.entities.push({
      src: entitySource,
      dest: targetEntity
    })
  }
  composite.id = compositeData.id

  return compositeRootEntity
}
