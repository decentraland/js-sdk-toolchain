import { useCallback, useEffect } from 'react'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import cx from 'classnames'
import { PBVisibilityComponent, PBGltfContainer } from '@dcl/ecs'

import { ContextMenu as Menu } from '../../ContexMenu'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { getComponentValue, useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { CoreComponents } from '../../../lib/sdk/components'
import { InfoTooltip } from '../InfoTooltip'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { Dropdown } from '../../Dropdown'
import { Props } from './types'

import './VisibilityComponentInspector.css'

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const { VisibilityComponent, GltfContainer } = sdk.components
    const { handleAction } = useContextMenu()
    const hasVisibilityComponent = useHasComponent(entity, VisibilityComponent)
    const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<PBVisibilityComponent>(
      entity,
      VisibilityComponent
    )
    const [collisionValue, setCollisionValue, isCollisionEqual] = useComponentValue<PBGltfContainer>(
      entity,
      GltfContainer
    )

    useEffect(() => {
      if (componentValue.visible === undefined) {
        setComponentValue({ ...componentValue, visible: true })
      }
    }, [componentValue])

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, VisibilityComponent)
      await sdk.operations.dispatch()
      const gltfContainer = getComponentValue(entity, GltfContainer)
      const asset = getAssetByModel(gltfContainer.src)
      analytics.track(Event.REMOVE_COMPONENT, {
        componentName: CoreComponents.VISIBILITY_COMPONENT,
        itemId: asset?.id,
        itemPath: gltfContainer.src
      })
    }, [])

    const handleChangeVisibility = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
        const current = sdk.components.VisibilityComponent.get(entity)
        const visible = value === 'true'

        if (isComponentEqual({ ...current, visible })) {
          return
        }

        setComponentValue({ ...current, visible })
      },
      [entity]
    )

    const handleChangeCollider = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
        const current = sdk.components.GltfContainer.get(entity)
        const invisibleMeshesCollisionMask = value === 'true' ? 2 : 0

        if (isCollisionEqual({ ...current, invisibleMeshesCollisionMask })) {
          return
        }

        setCollisionValue({ ...current, invisibleMeshesCollisionMask })
      },
      [entity]
    )

    const renderVisibilityMoreInfo = () => {
      return (
        <InfoTooltip
          text={
            'Use the Visibility property to hide an item during scene execution while keeping it visible in the editor.'
          }
        />
      )
    }

    const renderPhysicsCollidersMoreInfo = () => {
      return (
        <InfoTooltip
          text={'Use the Physics Collider property to turn on or off physical interaction with this item.'}
        />
      )
    }

    if (!hasVisibilityComponent) return null

    return (
      <Container label="Visibility" className={cx('VisibilityContainer')}>
        <Menu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </Menu>
        <Block>
          <div className="row">
            <div className="field">
              <label>Visibility {renderVisibilityMoreInfo()}</label>
              <Dropdown
                options={[
                  { value: 'true', text: 'Visible' },
                  { value: 'false', text: 'Invisible' }
                ]}
                value={(componentValue.visible ?? true).toString()}
                onChange={handleChangeVisibility}
              />
            </div>
            <div className="field">
              <label>Physics Collider {renderPhysicsCollidersMoreInfo()}</label>
              <Dropdown
                options={[
                  { value: 'true', text: 'Enabled' },
                  { value: 'false', text: 'Disabled' }
                ]}
                value={(collisionValue.invisibleMeshesCollisionMask === 2).toString()}
                onChange={handleChangeCollider}
              />
            </div>
          </div>
        </Block>
      </Container>
    )
  })
)
