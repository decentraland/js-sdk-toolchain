import { Item, Submenu, Separator } from 'react-contexify'
import { Entity } from '@dcl/ecs'
import { ComponentName } from '@dcl/asset-packs'

import { getConfig } from '../../../lib/logic/config'
import { ROOT } from '../../../lib/sdk/tree'
import { CoreComponents } from '../../../lib/sdk/components'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useEntityComponent } from '../../../hooks/sdk/useEntityComponent'
import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useSdk } from '../../../hooks/sdk/useSdk'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'

const DISABLED_COMPONENTS: string[] = [
  CoreComponents.ANIMATOR,
  CoreComponents.AUDIO_STREAM,
  CoreComponents.NFT_SHAPE,
  CoreComponents.VIDEO_PLAYER,
  CoreComponents.NETWORK_ENTITY,
  CoreComponents.TWEEN
]

const SMART_ITEM_COMPONENTS: string[] = [
  ComponentName.STATES,
  ComponentName.ACTIONS,
  ComponentName.TRIGGERS,
  ComponentName.COUNTER
]

export const getEnabledComponents = (disabledComponents = DISABLED_COMPONENTS) => {
  const components: Set<string> = new Set(Object.values(CoreComponents))
  const config = getConfig()

  if (!config.disableSmartItems) {
    for (const component of SMART_ITEM_COMPONENTS) {
      components.add(component)
    }
  }

  for (const component of disabledComponents) {
    components.delete(component)
  }

  return components
}

export const enabledComponents = getEnabledComponents()
export const transformComponentName = (value: string): string => {
  switch (value) {
    case CoreComponents.SYNC_COMPONENTS:
      return 'Multiplayer'
    default:
      return value
  }
}
export const getComponentName = (value: string) => (transformComponentName(value).match(/[^:]*$/) || [])[0] || '?'
export const isComponentEnabled = (value: string) => enabledComponents.has(value)

const ContextMenu = (value: Entity) => {
  const sdk = useSdk()
  const { getComponents, addComponent } = useEntityComponent()
  const { handleAction } = useContextMenu()
  const components = getComponents(value, true)
  const _components = Array.from(components.entries())
    .filter(([_, name]) => isComponentEnabled(name))
    .map(([id, name]) => ({ id, name: getComponentName(name) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleAddComponent = (id: string) => {
    addComponent(value, Number(id))
    if (sdk) {
      const gltfContainer = getComponentValue(value, sdk.components.GltfContainer)
      const asset = getAssetByModel(gltfContainer.src)
      analytics.track(Event.ADD_COMPONENT, {
        componentName: (components.get(Number(id)) ?? '').toString(),
        itemId: asset?.id,
        itemPath: gltfContainer.src
      })
    }
  }

  if (value === ROOT || !_components.length) return null

  return (
    <>
      <Separator />
      <Submenu label="Add component" itemID="add-component">
        {_components.map(({ id, name }) => (
          <Item key={id} id={id.toString()} itemID={name} onClick={handleAction(handleAddComponent)}>
            {name}
          </Item>
        ))}
      </Submenu>
    </>
  )
}

export default ContextMenu
