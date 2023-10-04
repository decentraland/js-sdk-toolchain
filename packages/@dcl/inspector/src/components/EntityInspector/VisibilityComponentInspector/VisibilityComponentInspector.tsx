import { useCallback } from 'react'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import cx from 'classnames'

import { ContextMenu as Menu } from '../../ContexMenu'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField } from '../TextField'
import { fromVisibility, toVisibility } from './utils'
import { Props } from './types'

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const { VisibilityComponent } = sdk.components
    const { handleAction } = useContextMenu()
    const hasVisibilityComponent = useHasComponent(entity, VisibilityComponent)

    const { getInputProps } = useComponentInput(entity, VisibilityComponent, fromVisibility, toVisibility)

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, VisibilityComponent)
      await sdk.operations.dispatch()
    }, [])

    if (!hasVisibilityComponent) return null

    const visible = getInputProps('visible', (e) => e.target.checked)

    return (
      <Container label="Entity Visibility" className={cx('VisibilityContainer')}>
        <Menu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </Menu>
        <Block>
          <TextField label="Visible" type="checkbox" checked={!!visible.value} {...visible} />
        </Block>
      </Container>
    )
  })
)
