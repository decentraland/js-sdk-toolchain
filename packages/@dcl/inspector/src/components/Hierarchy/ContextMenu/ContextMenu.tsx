import { Item, Submenu, Separator } from 'react-contexify'
import { Entity } from '@dcl/ecs'

import { ROOT } from '../../../lib/sdk/tree'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useEntityComponent } from '../../../hooks/sdk/useEntityComponent'

// TODO: enumerate better the components we want to show...
const ENABLED_COMPONENTS_SET = new Set(['core::Transform', 'core::GltfContainer'])

const getComponentName = (value: string) => (value.match(/[^:]*$/) || [])[0]
const isComponentEnabled = (value: string) => ENABLED_COMPONENTS_SET.has(value)

const ContextMenu = (value: Entity) => {
  const { getComponents, addComponent } = useEntityComponent()
  const { handleAction } = useContextMenu()
  const components = getComponents(value, true)
  const _components = Array.from(components.entries()).filter(([_, name]) => isComponentEnabled(name))

  const handleAddComponent = (id: string) => {
    addComponent(value, Number(id))
  }

  if (value === ROOT || !_components.length) return null

  return (
    <>
      <Separator />
      <Submenu label="Add component" itemID="add-component">
        {_components.map(([id, name]) => (
          <Item key={id} id={id.toString()} onClick={handleAction(handleAddComponent)}>
            {getComponentName(name)}
          </Item>
        ))}
      </Submenu>
    </>
  )
}

export default ContextMenu
