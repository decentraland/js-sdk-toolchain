import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { withSdk } from '../../../hoc/withSdk'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField } from '../TextField'
import { Props } from './types'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useCallback, useState } from 'react'

export default withSdk<Props>(({ sdk, entity }) => {
  const { States } = sdk.components

  const hasStates = useHasComponent(entity, States)
  const [states, setStates] = useComponentValue(entity, States)
  const [newValue, setNewValue] = useState('')

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target.value
      if (input.endsWith(' ')) {
        const valueToAdd = input.trim()
        if (valueToAdd) {
          setStates({
            ...states,
            value: [...states.value, valueToAdd]
          })
        }
        setNewValue('')
      } else {
        setNewValue(event.target.value)
      }
    },
    [states, setStates, setNewValue]
  )

  if (!hasStates) {
    return null
  }

  return (
    <Container label="States" className="States">
      <Block label="Possible states">
        <p>
          {states.value.map((state) => (
            <span>{state}</span>
          ))}
        </p>
        <TextField label="" value={newValue} onChange={handleChange} />
      </Block>
    </Container>
  )
})
