import { useCallback } from 'react'
import { Item, Menu } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import { ComponentName } from '@dcl/asset-packs'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { ROOT } from '../../../lib/sdk/tree'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { InfoTooltip } from '../InfoTooltip'
import { Container } from '../../Container'
import { TextField } from '../TextField'
import { fromCounter, isValidInput, toCounter } from './utils'
import { Props } from './types'

import './CounterInspector.css'

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const { Counter, GltfContainer } = sdk.components

    const hasCounter = useHasComponent(entity, Counter)
    const { getInputProps } = useComponentInput(entity, Counter, fromCounter, toCounter, isValidInput)

    const { handleAction } = useContextMenu()

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, Counter)
      await sdk.operations.dispatch()
      const gltfContainer = getComponentValue(entity, GltfContainer)
      const asset = getAssetByModel(gltfContainer.src)
      analytics.track(Event.REMOVE_COMPONENT, { componentName: ComponentName.COUNTER, parentItemId: asset?.id || '' })
    }, [sdk])

    if (!hasCounter || entity === ROOT) {
      return null
    }

    return (
      <Container
        label="Counter"
        className="CounterInspector"
        rightContent={
          <InfoTooltip
            text="Counter tracks numerical values that change based on player actions. Use it for conditional logic and to trigger actions when reaching certain values."
            link="https://docs.decentraland.org/creator/smart-items/#counter"
          />
        }
      >
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
