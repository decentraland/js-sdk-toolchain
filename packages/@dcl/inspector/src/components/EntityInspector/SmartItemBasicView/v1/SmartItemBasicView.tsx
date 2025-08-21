import React, { useCallback, useMemo } from 'react'
import { BsFillLightningChargeFill as SmartItemIcon } from 'react-icons/bs'
import { withSdk } from '../../../../hoc/withSdk'
import { ConfigComponentType } from '../../../../lib/sdk/components/Config'
import { Container } from '../../../Container'
import { NftView } from './NftView'
import { PointerEventView } from './PointerEventView'
import { CounterBarView } from './CounterBarView'
import { ActionView } from './ActionView'
import { TriggerView } from './TriggerView'
import { TweenView } from './TweenView'
import { VideoView } from './VideoView'
import { AdminToolsBasicView } from './AdminToolsBasicView'
import { RewardsBasicView } from './RewardsBasicView'
import { DefaultBasicViewField } from './DefaultBasicViewField/DefaultBasicViewField'
import { VideoScreenBasicView } from './VideoScreenBasicView'
import { type Props } from './types'

import './SmartItemBasicView.css'

const SmartItemBasicView = withSdk<Props>(({ sdk, entity }) => {
  const { Config } = sdk.components

  const renderField = useCallback(
    (field: ConfigComponentType['fields'][0], idx: number) => {
      switch (field.type) {
        case 'core::PointerEvents':
          return <PointerEventView entity={entity} key={`${idx}-${entity}`} />
        case 'asset-packs::Rewards':
          return <RewardsBasicView entity={entity} key={`${idx}-${entity}`} />
        case 'asset-packs::Actions':
          return <ActionView entity={entity} field={field} key={`${idx}-${entity}`} />
        case 'asset-packs::Triggers':
          return <TriggerView entity={entity} field={field} key={`${idx}-${entity}`} />
        case 'core::Tween':
          return <TweenView entity={entity} key={`${idx}-${entity}`} />
        case 'core::VideoPlayer':
          return <VideoView entity={entity} key={`${idx}-${entity}`} />
        case 'core::NftShape':
          return <NftView entity={entity} key={`${idx}-${entity}`} />
        case 'asset-packs::Counter':
        case 'asset-packs::CounterBar':
          return <CounterBarView entity={entity} field={field} key={`${idx}-${entity}`} />
        case 'asset-packs::AdminTools':
          return <AdminToolsBasicView entity={entity} key={`${idx}-${entity}`} />
        case 'asset-packs::VideoScreen':
          return <VideoScreenBasicView entity={entity} key={`${idx}-${entity}`} />
        default:
          return <DefaultBasicViewField entity={entity} field={field} key={`${idx}-${entity}`} />
      }
    },
    [entity]
  )

  const renderSmartItemIndicator = useCallback(() => {
    return (
      <div className="SmartItemBadge">
        <SmartItemIcon size={12} />
      </div>
    )
  }, [])

  const config = useMemo(() => {
    return Config.getOrNull(entity)
  }, [entity])

  if (!config) return null

  return (
    <Container
      label={config.componentName}
      indicator={renderSmartItemIndicator()}
      className="SmartItemBasicViewInspector"
    >
      {config.fields.map((field, idx) => renderField(field, idx))}
    </Container>
  )
})

export default React.memo(SmartItemBasicView)
