import { useCallback } from 'react'

import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { Container } from '../../Container'
import { Block } from '../../Block'
import { withSdk } from '../../../hoc/withSdk'
import { ROOT } from '../../../lib/sdk/tree'
import { fromCounterBar, toCounterBar, isValidInput } from './utils'
import { TextField, InfoTooltip, ColorField } from '../../ui'
import { Props } from './types'

import './CounterBarInspector.css'

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
