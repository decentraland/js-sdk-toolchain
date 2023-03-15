import { componentDefinitionByName } from '../components'
import { componentNumberFromName } from '../components/component-number'
import { TransformType } from '../components/manual/Transform'
import { Entity } from '../engine/entity'
import { IEngine, LastWriteWinElementSetComponentDefinition } from '../engine/types'
import { Schemas } from '../schemas'
import { getCompositeRootComponent } from './components'
import { Composite, CompositeProvider } from './types'

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
 *
 * @public
 * @deprecated composite is not being supported so far, please do not use this feature
 *
 */
/*#__PURE__*/
export function instanceComposite(
  engine: IEngine,
  compositeData: Composite,
  getNextAvailableEntity: () => Entity | null,
  compositeProvider: CompositeProvider,
  rootEntity?: Entity,
  alreadyRequestedId: Set<string> = new Set()
) {
  const TransformComponentNumber = componentNumberFromName('core::Transform')
  const CompositeRootComponent = getCompositeRootComponent(engine)
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
  // => This is not only a copy, we need to instance. Otherwise, we'd be missing that branches
  // => TODO: in the future, the instanciation is first, then the overides (to parameterize Composite, e.g. house with different wall colors)
  const childrenComposite = compositeData.components.find((item) => item.name === CompositeRootComponent.componentName)
  if (childrenComposite) {
    for (const [entity, childComposite] of childrenComposite.data) {
      const compositeRoot = childComposite as ReturnType<typeof CompositeRootComponent['create']>
      const composite = compositeProvider.getCompositeOrNull(compositeRoot.id)
      if (composite) {
        if (alreadyRequestedId.has(compositeRoot.id) || compositeRoot.id === compositeData.id) {
          throw new Error(
            `Composite ${compositeRoot.id} has a recursive instanciation while try to instance ${
              compositeData.id
            }. Previous instances: ${alreadyRequestedId.toString()}`
          )
        }

        instanceComposite(
          engine,
          composite,
          getNextAvailableEntity,
          compositeProvider,
          entity,
          new Set(alreadyRequestedId).add(compositeData.id)
        )
      }
    }
  }

  // ## 3 ##
  // Then, we copy the all rest of the components (skipping the Composite ones)
  for (const component of compositeData.components) {
    // We already instanced the composite
    if (component.name === CompositeRootComponent.componentName) continue

    // ## 3a ##
    // We find the component definition
    let componentDefinition
    const existingComponentDefinition = engine.getComponentOrNull(component.name)

    if (!existingComponentDefinition) {
      if (component.schema) {
        componentDefinition = engine.defineComponentFromSchema(component.name, Schemas.fromJson(component.schema))
      } else if (component.name.startsWith('core::')) {
        if (component.name in componentDefinitionByName) {
          componentDefinition = (componentDefinitionByName as any)[component.name](engine)
        } else {
          throw new Error(`The core component ${component.name} was not found.`)
        }
      } else {
        throw new Error(`${component.name} is not defined and there is no schema to define it.`)
      }
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
      if (componentDefinition.componentId === TransformComponentNumber) {
        const transform = componentValue as TransformType
        if (transform.parent) {
          transform.parent = getCompositeEntity(transform.parent)
        }

        // TODO: is it going to be necessary to remap assets? e.g. src param from AudioSource and GltfContainer
      } else {
        // TODO: with static reflection, look for `Schema.Entity` in custom components
      }
    }
  }

  const composite =
    CompositeRootComponent.getMutableOrNull(compositeRootEntity) || CompositeRootComponent.create(compositeRootEntity)
  for (const [entitySource, targetEntity] of mappedEntities) {
    composite.entities.push({
      src: entitySource,
      dest: targetEntity
    })
  }
  composite.id = compositeData.id

  return compositeRootEntity
}
