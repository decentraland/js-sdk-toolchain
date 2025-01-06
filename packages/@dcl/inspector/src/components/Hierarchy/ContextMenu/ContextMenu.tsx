import { useCallback } from 'react'
import { Item, Submenu, Separator } from 'react-contexify'
import { Entity } from '@dcl/ecs'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useEntityComponent } from '../../../hooks/sdk/useEntityComponent'
import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useSdk } from '../../../hooks/sdk/useSdk'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import CustomAssetIcon from '../../Icons/CustomAsset'
import { useEntitiesWith } from '../../../hooks/sdk/useEntitiesWith'
import { useAppDispatch, useAppSelector } from '../../../redux/hooks'
import { stageCustomAsset } from '../../../redux/data-layer'
import { getSelectedAssetsTab, selectAssetsTab } from '../../../redux/ui'
import { AssetsTab } from '../../../redux/ui/types'
import { useTree } from '../../../hooks/sdk/useTree'

const ContextMenu = (value: Entity) => {
  const sdk = useSdk()
  const { getComponents, addComponent, getAvailableComponents } = useEntityComponent()
  const { handleAction } = useContextMenu()
  const components = getComponents(value, true)
  const availableComponents = getAvailableComponents(value)
  const selectedEntities = useEntitiesWith((components) => components.Selection)
  const hasMultipleSelection = selectedEntities.length > 1
  const dispatch = useAppDispatch()
  const currentTab = useAppSelector(getSelectedAssetsTab)
  const { select } = useTree()

  const handleCreateCustomAsset = useCallback(async () => {
    if (!sdk) return
    // If not a multi-selection, ensure the right-clicked entity is selected
    if (!hasMultipleSelection) {
      await select(value)
    }
    const initialName = sdk.components.Name.get(value).value
    dispatch(
      stageCustomAsset({
        entities: hasMultipleSelection ? selectedEntities : [value],
        previousTab: currentTab,
        initialName
      })
    )
    dispatch(selectAssetsTab({ tab: AssetsTab.CreateCustomAsset }))
  }, [selectedEntities, dispatch, currentTab, sdk, value, select, hasMultipleSelection])

  const handleAddComponent = async (id: string) => {
    // Only allow adding components when a single entity is selected
    if (hasMultipleSelection) return

    // Ensure the right-clicked entity is selected
    await select(value)
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
        Create Custom Item
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
