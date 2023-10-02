import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { withSdk } from '../../../hoc/withSdk'
import { Container } from '../../Container'
import { TextField } from '../TextField'
import { fromCounter, isValidInput, toCounter } from './utils'
import { Props } from './types'

import './CounterInspector.css'

export default withSdk<Props>(({ sdk, entity }) => {
  const { Counter } = sdk.components

  const hasCounter = useHasComponent(entity, Counter)
  const { getInputProps } = useComponentInput(entity, Counter, fromCounter, toCounter, isValidInput)

  if (!hasCounter) {
    return null
  }

  return (
    <Container label="Counter" className="CounterInspector">
      <TextField label="Value" type="numeric" {...getInputProps('value')} />
    </Container>
  )
})
