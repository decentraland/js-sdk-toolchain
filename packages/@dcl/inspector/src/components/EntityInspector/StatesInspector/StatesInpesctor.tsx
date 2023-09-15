import { useCallback, useEffect, useState } from 'react'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { withSdk } from '../../../hoc/withSdk'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField } from '../TextField'
import { AddButton } from '../AddButton'
import { Props } from './types'
import { getUniqueState, isRepeated, isValidInput } from './utils'

import './StatesInspector.css'
import { States } from '@dcl/asset-packs'

export default withSdk<Props>(({ sdk, entity }) => {
  const { States } = sdk.components

  const hasStates = useHasComponent(entity, States)
  const [states, setStates, isComponentEqual] = useComponentValue(entity, States)
  const [input, setInput] = useState<States>(states)

  useEffect(() => {
    setInput({ ...states })
  }, [states])

  useEffect(() => {
    if (isValidInput(input) && !isComponentEqual(input)) {
      setStates(input)
    }
  }, [input])

  const handleNewState = useCallback(() => {
    const newState = getUniqueState('New State', input.value)
    setInput({
      ...input,
      value: [...input.value, newState],
      defaultValue: input.defaultValue || newState
    })
  }, [input, setInput])

  const handleChange = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const state = event.target.value
    const isDefault = states.value[index] === states.defaultValue
    const defaultValue = isDefault || !states.defaultValue ? state : states.defaultValue
    const newValue = [...input.value]
    newValue[index] = state
    setInput({
      ...input,
      value: newValue,
      defaultValue
    })
  }

  if (!hasStates) {
    return null
  }

  return (
    <Container label="States" className="StatesInspector">
      {states.value.length > 0 ? (
        <Block label="State Name" className="states-list">
          {input.value.map((state, index) => (
            <TextField
              rightLabel={states.defaultValue === state && !isRepeated(state, input.value) ? 'Default' : ''}
              value={state}
              error={isRepeated(state, input.value) || !state.trim()}
              onChange={handleChange(index)}
            />
          ))}
        </Block>
      ) : null}
      <AddButton onClick={handleNewState}>Add New State</AddButton>
    </Container>
  )
})
