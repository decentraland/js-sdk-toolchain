import React, { useMemo } from 'react'
import cx from 'classnames'
import { BiCube as EntityIcon } from 'react-icons/bi'
import { Entity } from '@dcl/ecs'
import { withSdk, WithSdkProps } from '../../../hoc/withSdk'
import { Dropdown } from '../Dropdown'
import type { Props } from './types'

function componentHasValidValue(component: any) {
  if (typeof component.value === 'number') {
    return component.value !== undefined
  } else if (typeof component.value === 'object') {
    return component.value.length > 0
  }

  return false
}

const EntityField: React.FC<WithSdkProps & Props> = ({ sdk, ...props }) => {
  const { engine } = sdk
  const { Name, Nodes } = sdk.components
  const { className, components, disabled, label, value, onChange } = props

  const options: Record<string, any>[] = useMemo(() => {
    const uniqueEntities = new Map()

    const mapEntity = (entity: Entity) => {
      const name = Name.get(entity)
      uniqueEntities.set(entity, {
        label: name.value,
        value: entity,
        leftIcon: <EntityIcon />
      })
    }

    if (components && components.length > 0) {
      // Get entities that contains a component
      for (const component of components) {
        const entities = engine.getEntitiesWith(component) || []
        for (const [entity, _component] of entities) {
          if (entity !== 0 && !uniqueEntities.has(entity) && componentHasValidValue(_component)) {
            mapEntity(entity)
          }
        }
      }
    } else {
      // Get all entities
      const entities = Nodes.getOrNull(engine.RootEntity)?.value || []
      for (const { entity } of entities) {
        if (entity !== 0 && !uniqueEntities.has(entity)) {
          mapEntity(entity)
        }
      }
    }

    return Array.from(uniqueEntities.values())
  }, [components])

  const emptyMessage = useMemo(() => {
    if (components && components.length > 0) {
      const componentsName = components.map((component) => component.componentName.split('::')[1])
      return `No entities found with ${componentsName.join(', ')} available.`
    } else {
      return 'No entities found in this project.'
    }
  }, [components])

  return (
    <Dropdown
      className={cx('EntityDropdown', className)}
      options={options}
      value={value}
      label={label}
      placeholder="Select Entity"
      empty={emptyMessage}
      disabled={disabled}
      onChange={onChange}
    />
  )
}

export default React.memo(withSdk(EntityField))
