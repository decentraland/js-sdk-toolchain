import {
  Entity,
  IEngine,
  Transform as TransformEngine,
  GltfContainer as GltfEngine,
  PBGltfContainer,
  Vector3Type,
  PBAudioSource,
  LastWriteWinElementSetComponentDefinition,
  PBVideoPlayer,
  PBMaterial,
  NetworkEntity as NetworkEntityEngine
} from '@dcl/ecs'
import {
  ActionType,
  Actions,
  COMPONENTS_WITH_ID,
  ComponentName,
  Triggers,
  getJson,
  getNextId,
  getPayload
} from '@dcl/asset-packs'

import { CoreComponents, EditorComponentNames } from '../../components'
import updateSelectedEntity from '../update-selected-entity'
import { addChild } from '../add-child'
import { isSelf, parseMaterial, parseSyncComponents } from './utils'
import { EnumEntity } from '../../enum-entity'

export function addAsset(engine: IEngine) {
  return function addAsset(
    parent: Entity,
    src: string,
    name: string,
    position: Vector3Type,
    base: string,
    enumEntityId: EnumEntity,
    components?: Partial<Record<CoreComponents | ComponentName | EditorComponentNames.Config, any>>,
    assetId?: string
  ): Entity {
    const child = addChild(engine)(parent, name)
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const GltfContainer = engine.getComponent(GltfEngine.componentId) as typeof GltfEngine
    const NetworkEntity = engine.getComponent(NetworkEntityEngine.componentId) as typeof NetworkEntityEngine

    Transform.createOrReplace(child, { parent, position })

    if (components) {
      // values
      const values = new Map<string, any>()

      // generate ids
      const ids = new Map<string, number>()
      for (const componentName in components) {
        const key = componentName as keyof typeof components
        const componentValue = components[key] ? { ...components[key] } : {}
        if (COMPONENTS_WITH_ID.includes(componentName) && isSelf(componentValue.id)) {
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
          case CoreComponents.VIDEO_PLAYER: {
            const videoPlayer = values.get(componentName) as PBVideoPlayer
            values.set(componentName, { ...videoPlayer, src: videoPlayer.src.replace('{assetPath}', base) })
            break
          }
          case CoreComponents.MATERIAL: {
            const material = values.get(componentName) as PBMaterial
            values.set(componentName, parseMaterial(base, material))
            break
          }
          case ComponentName.ACTIONS: {
            const actions = values.get(componentName) as Actions
            const newValue: Actions['value'] = []
            for (const action of actions.value) {
              switch (action.type) {
                case ActionType.PLAY_SOUND: {
                  const payload = getPayload<ActionType.PLAY_SOUND>(action)
                  newValue.push({
                    ...action,
                    jsonPayload: getJson<ActionType.PLAY_SOUND>({
                      ...payload,
                      src: payload.src.replace('{assetPath}', base)
                    })
                  })
                  break
                }
                case ActionType.PLAY_CUSTOM_EMOTE: {
                  const payload = getPayload<ActionType.PLAY_CUSTOM_EMOTE>(action)
                  newValue.push({
                    ...action,
                    jsonPayload: getJson<ActionType.PLAY_CUSTOM_EMOTE>({
                      ...payload,
                      src: payload.src.replace('{assetPath}', base)
                    })
                  })
                  break
                }
                default:
                  newValue.push(action)
                  break
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
          case CoreComponents.SYNC_COMPONENTS: {
            const componentNames = values.get(componentName) as { value: string[] }
            const componentIds = parseSyncComponents(engine, componentNames.value)
            values.set(componentName, { componentIds })
            values.set(NetworkEntity.componentName, { entityId: enumEntityId.getNextEnumEntityId(), networkId: 0 })
            break
          }
          case EditorComponentNames.Config: {
            values.set(componentName, { ...components[componentName], assetId })
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
