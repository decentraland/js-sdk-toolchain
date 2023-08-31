import { Item, Submenu, Separator } from 'react-contexify'
import { Entity } from '@dcl/ecs'

import { ROOT } from '../../../lib/sdk/tree'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useEntityComponent } from '../../../hooks/sdk/useEntityComponent'

// TODO: enumerate better the components we want to show...
const getEnabledComponents = () => {
  const components = new Set(['core::Transform', 'core::GltfContainer'])

  if (JSON.parse(process.env.ENABLE_INSPECTOR_COMPONENTS || '')) {
    for (const component of ['inspector::Actions', 'inspector::Triggers']) {
      components.add(component)
    }
  }

  return components
}

const getComponentName = (value: string) => (value.match(/[^:]*$/) || [])[0]
const isComponentEnabled = (value: string) => getEnabledComponents().has(value)

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
          <Item key={id} id={id.toString()} itemID={getComponentName(name)} onClick={handleAction(handleAddComponent)}>
            {getComponentName(name)}
          </Item>
        ))}
      </Submenu>
    </>
  )
}

export default ContextMenu
