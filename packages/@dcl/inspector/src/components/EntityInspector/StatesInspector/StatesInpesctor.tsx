import { useCallback, useEffect, useState } from 'react'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { withSdk } from '../../../hoc/withSdk'
import { Block } from '../../Block'
import { Button } from '../../Button'
import { Container } from '../../Container'
import { TextField } from '../TextField'
import { AddButton } from '../AddButton'
import { Props } from './types'
import { getUniqueState, isRepeated, isValidInput } from './utils'

import './StatesInspector.css'
import { States } from '@dcl/asset-packs'
import MoreOptionsMenu from '../MoreOptionsMenu'

export default withSdk<Props>(({ sdk, entity }) => {
  const { States } = sdk.components

  const hasStates = useHasComponent(entity, States)
  const [states, setStates, isComponentEqual] = useComponentValue(entity, States)
  const [input, setInput] = useState<States>(states)
  const [nonce, setNonce] = useState(0)

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
    const newValue = [...input.value]
    newValue[index] = state
    const defaultValue =
      isDefault || !states.defaultValue || !newValue.includes(states.defaultValue) ? state : states.defaultValue
    setInput({
      ...input,
      value: newValue,
      defaultValue
    })
  }

  if (!hasStates) {
    return null
  }

  const handleRemove = (state: string) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const newValue = input.value.filter(($) => $ !== state)
    const defaultValue = input.defaultValue && newValue.includes(input.defaultValue) ? input.defaultValue : newValue[0]
    setInput({
      ...input,
      value: newValue,
      defaultValue
    })
    setNonce((nonce) => nonce + 1)
  }

  const handleDefault = (state: string) => () => {
    setInput({
      ...input,
      defaultValue: state
    })
    setNonce((nonce) => nonce + 1)
  }

  return (
    <Container label="States" className="StatesInspector">
      {states.value.length > 0 ? (
        <Block label="State Name" className="states-list">
          {input.value.map((state, index) => (
            <div className="row" key={`${index}-${nonce}`}>
              <TextField
                rightLabel={states.defaultValue === state && !isRepeated(state, input.value) ? 'Default' : ' '}
                value={state}
                error={isRepeated(state, input.value) || !state.trim()}
                onChange={handleChange(index)}
              />
              <MoreOptionsMenu>
                <Button onClick={handleRemove(state)}>Remove State</Button>
                <Button onClick={handleDefault(state)}>Set as Default</Button>
              </MoreOptionsMenu>
            </div>
          ))}
        </Block>
      ) : null}
      <AddButton onClick={handleNewState}>Add New State</AddButton>
    </Container>
  )
})
