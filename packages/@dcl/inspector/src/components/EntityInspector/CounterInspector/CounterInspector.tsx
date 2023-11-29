import { useCallback } from 'react'

import { ComponentName } from '@dcl/asset-packs'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { ROOT } from '../../../lib/sdk/tree'
import { withSdk } from '../../../hoc/withSdk'
import { Container } from '../../Container'
import { TextField, InfoTooltip } from '../../ui'
import { fromCounter, isValidInput, toCounter } from './utils'
import { Props } from './types'

import './CounterInspector.css'

export default withSdk<Props>(({ sdk, entity }) => {
  const { Counter, GltfContainer } = sdk.components

  const hasCounter = useHasComponent(entity, Counter)
  const { getInputProps } = useComponentInput(entity, Counter, fromCounter, toCounter, isValidInput)

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, Counter)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entity, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: ComponentName.COUNTER,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
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
          type="help"
        />
      }
      onRemoveContainer={handleRemove}
    >
      <TextField leftLabel="Value" type="number" {...getInputProps('value')} />
    </Container>
  )
})
