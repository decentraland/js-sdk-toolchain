import React, { useCallback, useMemo } from 'react'
import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { ConfigComponent } from '../../../lib/sdk/components'
import { Container } from '../../Container'
import { NftView } from './NftView'
import { PointerEventView } from './PointerEventView'
import { TriggerView } from './TriggerView'
import { TweenView } from './TweenView'
import { VideoView } from './VideoView'
import { type Props } from './types'

import './SmartItemBasicView.css'

const SmartItemBasicView = withSdk<Props>(({ sdk, entity }) => {
  const { Config } = sdk.components
  const hasConfig = useHasComponent(entity, Config)

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, Config)
    await sdk.operations.dispatch()
  }, [entity])

  const renderField = useCallback(
    (field: ConfigComponent['fields'][0], idx: number) => {
      switch (field.type) {
        case 'core::PointerEvents':
          return <PointerEventView entity={entity} key={idx} />
        case 'asset-packs::Triggers':
          return <TriggerView entity={entity} field={field} key={idx} />
        case 'core::Tween':
          return <TweenView entity={entity} key={idx} />
        case 'core::VideoPlayer':
          return <VideoView entity={entity} key={idx} />
        case 'core::NftShape':
          return <NftView entity={entity} key={idx} />
        default:
          return null
      }
    },
    [entity]
  )

  if (!hasConfig) return null

  const config = useMemo(() => {
    return Config.get(entity)
  }, [entity])

  return (
    <Container label={config.componentName} className="SmartItemBasicViewInspector" onRemoveContainer={handleRemove}>
      {config.fields.map((field, idx) => renderField(field, idx))}
    </Container>
  )
})

export default React.memo(SmartItemBasicView)
