import React from 'react'
import { Entity } from '@dcl/ecs'
import { withSdk, WithSdkProps } from '../../../../hoc/withSdk'
import { useComponentInput } from '../../../../hooks/sdk/useComponentInput'
import { ConfigComponent } from '../../../../lib/sdk/components'
import { Block } from '../../../Block'
import { TextField, ColorField } from '../../../ui'
import { fromCounterBar, isValidInput as isValidCounterBarInput, toCounterBar } from '../../CounterBarInspector/utils'
import { fromCounter, isValidInput as isValidCounterInput, toCounter } from '../../CounterInspector/utils'

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity; field: ConfigComponent['fields'][0] }>(({ sdk, entity, field }) => {
    const { Counter, CounterBar } = sdk.components
    const { getInputProps: getCounterInputProps } = useComponentInput(
      entity,
      Counter,
      fromCounter,
      toCounter,
      isValidCounterInput
    )
    const { getInputProps: getCounterBarInputProps } = useComponentInput(
      entity,
      CounterBar,
      fromCounterBar,
      toCounterBar,
      isValidCounterBarInput
    )

    return (
      <>
        <Block>
          <TextField
            label={field.name}
            type="number"
            {...(field.type === 'asset-packs::CounterBar'
              ? getCounterBarInputProps('maxValue')
              : getCounterInputProps('value'))}
          />
        </Block>
        {field.type === 'asset-packs::CounterBar' && (
          <>
            <Block>
              <ColorField label="Primary Color" {...getCounterBarInputProps('primaryColor')} />
            </Block>
            <Block>
              <ColorField label="Secondary Color" {...getCounterBarInputProps('secondaryColor')} />
            </Block>
          </>
        )}
      </>
    )
  })
)
