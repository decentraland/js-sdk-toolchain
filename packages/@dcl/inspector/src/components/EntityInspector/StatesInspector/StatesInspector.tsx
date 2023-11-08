import { useCallback, useEffect, useState } from 'react'
import { ComponentName, States } from '@dcl/asset-packs'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { getComponentValue, useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { withSdk } from '../../../hoc/withSdk'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { Block } from '../../Block'
import { Button } from '../../Button'
import { Container } from '../../Container'
import { TextField } from '../../ui/TextField'
import { AddButton } from '../AddButton'
import MoreOptionsMenu from '../MoreOptionsMenu'
import { InfoTooltip } from '../../ui/InfoTooltip'
import { Props } from './types'
import { getUniqueState, isRepeated, isValidInput } from './utils'

import './StatesInspector.css'

export default withSdk<Props>(({ sdk, entity }) => {
  const { States, GltfContainer } = sdk.components

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

  const handleDelete = useCallback(async () => {
    sdk.operations.removeComponent(entity, States)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entity, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: ComponentName.STATES,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
  }, [sdk])

  if (!hasStates) {
    return null
  }

  const handleRemove = (state: string) => () => {
    const newValue = input.value.filter(($) => $ !== state)
    const defaultValue = input.defaultValue && newValue.includes(input.defaultValue) ? input.defaultValue : newValue[0]
    setInput({
      ...input,
      value: newValue,
      defaultValue
    })
  }

  const handleDefault = (state: string) => () => {
    setInput({
      ...input,
      defaultValue: state
    })
  }

  return (
    <Container
      label="States"
      className="StatesInspector"
      rightContent={
        <InfoTooltip
          text="States specify the status of entities. Use triggers to check or change states, and set actions accordingly."
          link="https://docs.decentraland.org/creator/smart-items/#states"
          type="help"
        />
      }
      onRemoveContainer={handleDelete}
    >
      {states.value.length > 0 ? (
        <Block label="State Name" className="states-list">
          {input.value.map((state, index) => (
            <div className="row" key={index}>
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
