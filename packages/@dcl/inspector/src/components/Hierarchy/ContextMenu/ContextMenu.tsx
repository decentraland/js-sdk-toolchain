import { Item, Submenu, Separator } from 'react-contexify'
import { Entity } from '@dcl/ecs'
import { ComponentName } from '@dcl/asset-packs'

import { getConfig } from '../../../lib/logic/config'
import { ROOT } from '../../../lib/sdk/tree'
import { CoreComponents } from '../../../lib/sdk/components'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useEntityComponent } from '../../../hooks/sdk/useEntityComponent'
import { useAnalytics, Event } from '../../../hooks/useAnalytics'

// TODO: enumerate better the components we want to show...
const getEnabledComponents = () => {
  const components: Set<string> = new Set(Object.values(CoreComponents))

  const config = getConfig()

  if (!config.disableSmartItems) {
    for (const component of [
      ComponentName.STATES,
      ComponentName.ACTIONS,
      ComponentName.TRIGGERS,
      ComponentName.COUNTER
    ]) {
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
  const { track } = useAnalytics()
  const components = getComponents(value, true)
  const _components = Array.from(components.entries()).filter(([_, name]) => isComponentEnabled(name))

  const handleAddComponent = (id: string) => {
    addComponent(value, Number(id))
    track(Event.ADD_COMPONENT, { type: components.get(Number(id)) as string, parentAssetPackId: value })
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
