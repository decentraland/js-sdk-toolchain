import { useCallback } from 'react'
import { Item, Submenu, Separator } from 'react-contexify'
import { Entity } from '@dcl/ecs'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useEntityComponent } from '../../../hooks/sdk/useEntityComponent'
import { useCustomAsset } from '../../../hooks/sdk/useCustomAsset'
import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useSdk } from '../../../hooks/sdk/useSdk'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import CustomAssetIcon from '../../Icons/CustomAsset'
import { useEntitiesWith } from '../../../hooks/sdk/useEntitiesWith'

const ContextMenu = (value: Entity) => {
  const sdk = useSdk()
  const { getComponents, addComponent, getAvailableComponents } = useEntityComponent()
  const { create: createCustomAsset } = useCustomAsset()
  const { handleAction } = useContextMenu()
  const components = getComponents(value, true)
  const availableComponents = getAvailableComponents(value)
  const selectedEntities = useEntitiesWith((components) => components.Selection)
  const hasMultipleSelection = selectedEntities.length > 1

  const handleCreateCustomAsset = useCallback(() => {
    // Apply to all selected entities
    createCustomAsset(selectedEntities)
  }, [selectedEntities, createCustomAsset])

  const handleAddComponent = (id: string) => {
    // Only allow adding components when a single entity is selected
    if (hasMultipleSelection) return

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

  return (
    <>
      <Item onClick={handleAction(handleCreateCustomAsset)}>
        <CustomAssetIcon />
        Create Custom Asset
      </Item>
      {!hasMultipleSelection && availableComponents.length > 0 && (
        <>
          <Separator />
          <Submenu label="Add component" itemID="add-component">
            {availableComponents.map(({ id, name }) => (
              <Item key={id} id={id.toString()} itemID={name} onClick={handleAction(handleAddComponent)}>
                {name}
              </Item>
            ))}
          </Submenu>
        </>
      )}
    </>
  )
}

export default ContextMenu
