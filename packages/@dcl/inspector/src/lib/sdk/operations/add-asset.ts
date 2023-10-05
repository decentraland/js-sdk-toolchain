import {
  Entity,
  IEngine,
  Transform as TransformEngine,
  GltfContainer as GltfEngine,
  PBGltfContainer,
  Vector3Type,
  PBAudioSource,
  LastWriteWinElementSetComponentDefinition
} from '@dcl/ecs'
import { ActionType, Actions, ComponentName, Triggers, getJson, getNextId, getPayload } from '@dcl/asset-packs'
import { CoreComponents } from '../components'
import updateSelectedEntity from './update-selected-entity'
import { addChild } from './add-child'
import { withId } from './add-component'

function isSelf(value: any) {
  return `${value}` === `{self}`
}

export function addAsset(engine: IEngine) {
  return function addAsset(
    parent: Entity,
    src: string,
    name: string,
    position: Vector3Type,
    base: string,
    components?: Partial<Record<CoreComponents | ComponentName, any>>
  ): Entity {
    const child = addChild(engine)(parent, name)
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const GltfContainer = engine.getComponent(GltfEngine.componentId) as typeof GltfEngine

    Transform.createOrReplace(child, { parent, position })

    if (components) {
      // values
      const values = new Map<string, any>()

      // generate ids
      const ids = new Map<string, number>()
      for (const componentName in components) {
        const key = componentName as keyof typeof components
        const componentValue = components[key] ? { ...components[key] } : {}
        if (withId.includes(componentName) && isSelf(componentValue.id)) {
          componentValue.id = getNextId(engine as any)
          ids.set(componentName, componentValue.id)
        }
        values.set(componentName, componentValue)
      }

      // map paths, ids, and modify values if needed
      const mapId = (id: string | number | undefined) => {
        if (typeof id === 'string') {
          if (/{self:(.+)}/.test(id)) {
            const result = id.match(/{self:(.+)}/)
            if (result) {
              const componentName = result[1] as ComponentName
              const mappedId = ids.get(componentName)
              if (mappedId) {
                return mappedId
              }
            }
          }
          return parseInt(id)
        }
        return id
      }
      for (const componentName in components) {
        switch (componentName) {
          case CoreComponents.GLTF_CONTAINER: {
            const gltfContainer = values.get(componentName) as PBGltfContainer
            gltfContainer.visibleMeshesCollisionMask ??= 1
            gltfContainer.invisibleMeshesCollisionMask ??= 2
            values.set(componentName, { ...gltfContainer, src: gltfContainer.src.replace('{assetPath}', base) })
            break
          }
          case CoreComponents.AUDIO_SOURCE: {
            const audioSource = values.get(componentName) as PBAudioSource
            values.set(componentName, { ...audioSource, src: audioSource.audioClipUrl.replace('{assetPath}', base) })
            break
          }
          case ComponentName.ACTIONS: {
            const actions = values.get(componentName) as Actions
            const newValue: Actions['value'] = []
            for (const action of actions.value) {
              if (action.type === ActionType.PLAY_SOUND) {
                const payload = getPayload<ActionType.PLAY_SOUND>(action)
                newValue.push({
                  ...action,
                  jsonPayload: getJson<ActionType.PLAY_SOUND>({
                    ...payload,
                    src: payload.src.replace('{assetPath}', base)
                  })
                })
              } else {
                newValue.push(action)
              }
            }
            values.set(componentName, { ...actions, value: newValue })
            break
          }
          case ComponentName.TRIGGERS: {
            const triggers = values.get(componentName) as Triggers
            const newValue = triggers.value.map((trigger) => ({
              ...trigger,
              conditions: (trigger.conditions || []).map((condition) => ({
                ...condition,
                id: mapId(condition.id)
              })),
              actions: trigger.actions.map((action) => ({
                ...action,
                id: mapId(action.id)
              }))
            }))
            values.set(componentName, { ...triggers, value: newValue })
            break
          }
        }
      }

      // create components
      for (const [componentName, componentValue] of values) {
        const Component = engine.getComponent(componentName) as LastWriteWinElementSetComponentDefinition<unknown>
        Component.create(child, componentValue)
      }
    } else {
      // if the asset is just a path to a model, create a gltf container for it (this is the case for assets dropped from the local files tab)
      GltfContainer.create(child, {
        src: `${base}/${src}`,
        visibleMeshesCollisionMask: 1,
        invisibleMeshesCollisionMask: 2
      })
    }

    // update selection
    updateSelectedEntity(engine)(child)

    return child
  }
}

export default addAsset
