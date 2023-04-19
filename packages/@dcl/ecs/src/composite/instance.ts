import { componentDefinitionByName } from '../components'
import { componentNumberFromName } from '../components/component-number'
import { TransformType } from '../components/manual/Transform'
import { Entity } from '../engine/entity'
import { ComponentDefinition, IEngine, LastWriteWinElementSetComponentDefinition } from '../engine/types'
import { Schemas } from '../schemas'
import { ReadWriteByteBuffer } from '../serialization/ByteBuffer'
import { getCompositeRootComponent } from './components'
import { ComponentData, CompositeComponent, CompositeDefinition } from './proto/gen/composite.gen'
import * as path from './path'

/**
 * @public
 */
export type CompositeResource = {
  // The source in a composite resource needs to be well-resolved with path.resolve(), so it's common
  src: string
  composite: CompositeDefinition
}

/**
 * @param src - the source path of the composite
 * @public
 */
export type CompositeProvider = {
  getCompositeOrNull(src: string): CompositeResource | null
}

/** @public */
/* @__PURE__ */
export enum EntityMappingMode {
  EMM_NONE = 0,
  EMM_NEXT_AVAILABLE = 1,
  EMM_DIRECT_MAPPING = 2
}

/** @public  */
export type InstanceCompositeOptions = {
  entityMapping?:
    | {
        type: EntityMappingMode.EMM_NEXT_AVAILABLE
        getNextAvailableEntity: () => Entity | null
      }
    | {
        type: EntityMappingMode.EMM_DIRECT_MAPPING
        getCompositeEntity: (compositeEntity: Entity | number) => Entity
      }
  rootEntity?: Entity
  alreadyRequestedSrc?: Set<string>
}

/**
 * Return the component value from composite data
 * @internal
 */
export function getComponentValue<T = unknown>(
  componentDefinition: ComponentDefinition<T>,
  component: ComponentData
): T {
  if (component.data?.$case === 'json') {
    return component.data.json
  } else {
    return componentDefinition.schema.deserialize(new ReadWriteByteBuffer(component.data?.binary))
  }
}

/**
 * Return the component definition from composite info
 * @internal
 */
export function getComponentDefinition(
  engine: IEngine,
  component: CompositeComponent
): LastWriteWinElementSetComponentDefinition<unknown> {
  const existingComponentDefinition = engine.getComponentOrNull(component.name)

  if (!existingComponentDefinition) {
    if (component.name.startsWith('core::')) {
      if (component.name in componentDefinitionByName) {
        return (componentDefinitionByName as any)[component.name](
          engine
        ) as LastWriteWinElementSetComponentDefinition<unknown>
      } else {
        throw new Error(`The core component ${component.name} was not found.`)
      }
    } else if (component.jsonSchema) {
      return engine.defineComponentFromSchema(component.name, Schemas.fromJson(component.jsonSchema))
    } else {
      throw new Error(`${component.name} is not defined and there is no schema to define it.`)
    }
  } else {
    return existingComponentDefinition as LastWriteWinElementSetComponentDefinition<unknown>
  }
}

/**
 * Return the entity mapping or fail if there is no more
 * @internal
 */
export function getEntityMapping(
  engine: IEngine,
  compositeEntity: Entity,
  mappedEntities: Map<Entity, Entity>,
  { entityMapping }: InstanceCompositeOptions
): Entity {
  const existingEntity = mappedEntities.get(compositeEntity)
  if (existingEntity) {
    return existingEntity
  }

  if (entityMapping?.type === EntityMappingMode.EMM_DIRECT_MAPPING) {
    const entity = entityMapping.getCompositeEntity(compositeEntity)
    mappedEntities.set(compositeEntity, entity)
    return entity
  }

  // This function in runtime can be just `engine.addEntity()`
  const newEntity =
    entityMapping?.type === EntityMappingMode.EMM_NEXT_AVAILABLE
      ? entityMapping.getNextAvailableEntity()
      : engine.addEntity()

  if (newEntity === null) {
    throw new Error('There is no more entities to allocate')
  }

  mappedEntities.set(compositeEntity, newEntity)
  return newEntity
}

/**
 * @internal
 */
/* @__PURE__ */
export function instanceComposite(
  engine: IEngine,
  compositeResource: CompositeResource,
  compositeProvider: CompositeProvider,
  options: InstanceCompositeOptions
) {
  const { rootEntity, alreadyRequestedSrc: optionalAlreadyRequestedSrc, entityMapping } = options
  const alreadyRequestedSrc = optionalAlreadyRequestedSrc || new Set<string>()

  const compositeDirectoryPath = path.dirname(path.resolve(compositeResource.src))

  const TransformComponentNumber = componentNumberFromName('core::Transform')
  const CompositeRootComponent = getCompositeRootComponent(engine)
  // Key => EntityNumber from the composite
  // Value => EntityNumber in current engine
  const mappedEntities: Map<Entity, Entity> = new Map()
  const getCompositeEntity = (compositeEntity: Entity | number) =>
    getEntityMapping(engine, compositeEntity as Entity, mappedEntities, options)

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
  const childrenComposite = compositeResource.composite.components.find(
    (item) => item.name === CompositeRootComponent.componentName
  )
  if (childrenComposite) {
    for (const [childCompositeEntity, compositeRawData] of childrenComposite.data) {
      const childComposite = getComponentValue(CompositeRootComponent, compositeRawData)
      const childCompositePath = path.resolveComposite(childComposite.src, compositeDirectoryPath)
      const childCompositeResource = compositeProvider.getCompositeOrNull(childCompositePath)
      const targetEntity = getCompositeEntity(childCompositeEntity)
      if (childCompositeResource) {
        if (
          alreadyRequestedSrc.has(childCompositeResource.src) ||
          childCompositeResource.src === compositeResource.src
        ) {
          throw new Error(
            `Composite ${compositeResource.src} has a recursive instanciation while try to instance ${
              childCompositeResource.src
            }. Previous instances: ${alreadyRequestedSrc.toString()}`
          )
        }

        instanceComposite(engine, childCompositeResource, compositeProvider, {
          rootEntity: targetEntity as Entity,
          alreadyRequestedSrc: new Set(alreadyRequestedSrc).add(childCompositeResource.src),
          entityMapping: entityMapping?.type === EntityMappingMode.EMM_NEXT_AVAILABLE ? entityMapping : undefined
        })
      }
    }
  }

  // ## 3 ##
  // Then, we copy the all rest of the components (skipping the Composite ones)
  for (const component of compositeResource.composite.components) {
    // We already instanced the composite
    if (component.name === CompositeRootComponent.componentName) continue

    // ## 3a ##
    // We find the component definition
    const componentDefinition: LastWriteWinElementSetComponentDefinition<unknown> = getComponentDefinition(
      engine,
      component
    )

    // ## 3b ##
    // Iterating over all the entities with this component and create the replica
    for (const [entity, compositeComponentValue] of component.data) {
      const componentValueDeserialized = getComponentValue(componentDefinition, compositeComponentValue)
      const targetEntity = getCompositeEntity(entity)
      const componentValue = componentDefinition.create(targetEntity, componentValueDeserialized)

      // ## 3c ##
      // All entities referenced in the composite probably has a different resolved EntityNumber
      // We'll know with the mappedEntityes
      if (componentDefinition.componentId === TransformComponentNumber) {
        const transform = componentValue as TransformType
        if (transform.parent) {
          transform.parent = getCompositeEntity(transform.parent)
        } else {
          transform.parent = getCompositeEntity(0)
        }

        // TODO: is it going to be necessary to remap assets? e.g. src param from AudioSource and GltfContainer
      } else {
        Schemas.mutateNestedValues(componentDefinition.schema.jsonSchema, componentValue, (value, valueType) => {
          if (valueType.serializationType === 'entity') {
            return { changed: true, value: getCompositeEntity(value as Entity) }
          } else {
            return { changed: false }
          }
        })
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
  composite.src = compositeResource.src

  return compositeRootEntity
}
