import { useCallback } from 'react'

// import { ComponentName } from '@dcl/asset-packs'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
// import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
// import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { ROOT } from '../../../lib/sdk/tree'
import { withSdk } from '../../../hoc/withSdk'
import { Container } from '../../Container'
import { TextField, InfoTooltip, ColorField } from '../../ui'
// import { fromCounter, isValidInput, toCounter } from './utils'
import { Props } from './types'

import './CounterBarInspector.css'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { fromCounterBar, toCounterBar, isValidInput } from './utils'
import { Block } from '../../Block'

export default withSdk<Props>(({ sdk, entity }) => {
  const { CounterBar } = sdk.components

  const { getInputProps } = useComponentInput(entity, CounterBar, fromCounterBar, toCounterBar, isValidInput)

  const hasCounterBar = useHasComponent(entity, CounterBar)

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, CounterBar)
    await sdk.operations.dispatch()
  }, [sdk])

  if (!hasCounterBar || entity === ROOT) {
    return null
  }

  return (
    <Container
      label="CounterBar"
      className="CounterBarInspector"
      rightContent={
        <InfoTooltip
          text="Counter tracks numerical values that change based on player actions. Use it for conditional logic and to trigger actions when reaching certain values."
          link="https://docs.decentraland.org/creator/smart-items/#counter"
          type="help"
        />
      }
      onRemoveContainer={handleRemove}
    >
      <TextField label="Max Value" type="number" {...getInputProps('maxValue')} />
      <Block>
        <ColorField label="Primary Color" {...getInputProps('primaryColor')} />
      </Block>
      <Block>
        <ColorField label="Secondary Color" {...getInputProps('secondaryColor')} />
      </Block>
    </Container>
  )
})
