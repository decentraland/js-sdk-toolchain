import { Item, Submenu, Separator } from 'react-contexify'
import { Entity } from '@dcl/ecs'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useEntityComponent } from '../../../hooks/sdk/useEntityComponent'
import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useSdk } from '../../../hooks/sdk/useSdk'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'

const ContextMenu = (value: Entity) => {
  const sdk = useSdk()
  const { getComponents, addComponent, getAvailableComponents } = useEntityComponent()
  const { handleAction } = useContextMenu()
  const components = getComponents(value, true)
  const availableComponents = getAvailableComponents(value)

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

  if (!availableComponents.length) return null

  return (
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
  )
}

export default ContextMenu
