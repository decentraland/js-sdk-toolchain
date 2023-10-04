import { useCallback } from 'react'
import { Item, Menu } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { ROOT } from '../../../lib/sdk/tree'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { Container } from '../../Container'
import { TextField } from '../TextField'
import { fromCounter, isValidInput, toCounter } from './utils'
import { Props } from './types'

import './CounterInspector.css'

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const { Counter } = sdk.components

    const hasCounter = useHasComponent(entity, Counter)
    const { getInputProps } = useComponentInput(entity, Counter, fromCounter, toCounter, isValidInput)

    const { handleAction } = useContextMenu()

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, Counter)
      await sdk.operations.dispatch()
    }, [sdk])

    if (!hasCounter || entity === ROOT) {
      return null
    }

    return (
      <Container label="Counter" className="CounterInspector">
        <Menu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </Menu>
        <TextField label="Value" type="numeric" {...getInputProps('value')} />
      </Container>
    )
  })
)
