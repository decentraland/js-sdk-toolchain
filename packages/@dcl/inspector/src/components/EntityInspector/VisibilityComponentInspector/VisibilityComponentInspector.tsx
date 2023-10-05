import { useCallback, useEffect } from 'react'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import { VscInfo as InfoIcon } from 'react-icons/vsc'
import cx from 'classnames'
import { PBVisibilityComponent } from '@dcl/ecs'
import { Popup } from 'decentraland-ui/dist/components/Popup/Popup'

import { ContextMenu as Menu } from '../../ContexMenu'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { Dropdown } from '../../Dropdown'
import { Props } from './types'

import './VisibilityComponentInspector.css'

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const { VisibilityComponent } = sdk.components
    const { handleAction } = useContextMenu()
    const hasVisibilityComponent = useHasComponent(entity, VisibilityComponent)
    const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<PBVisibilityComponent>(
      entity,
      VisibilityComponent
    )

    useEffect(() => {
      if (componentValue.visible === undefined) {
        setComponentValue({ ...componentValue, visible: true })
      }
    }, [componentValue])

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, VisibilityComponent)
      await sdk.operations.dispatch()
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

    const renderVisibilityMoreInfo = () => {
      return (
        <Popup
          content={
            'Use the Visibility property to hide an item during scene execution while keeping it visible in the editor.'
          }
          trigger={<InfoIcon size={16} />}
          position="top center"
          on="hover"
          hideOnScroll
          hoverable
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
          </div>
        </Block>
      </Container>
    )
  })
)
