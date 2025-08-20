import React, { useMemo } from 'react'
import { withSdk } from '../../../hoc/withSdk'
import SmartItemBasicViewV1 from './v1/SmartItemBasicView'
import SmartItemBasicViewV2 from './v2/SmartItemBasicView'
import { type Props } from './types'

const CONFIG_VERSION = 2

const SmartItemBasicView = withSdk<Props>(({ sdk, entity }) => {
  const { Config } = sdk.components

  const config = useMemo(() => {
    return Config.getOrNull(entity)
  }, [entity])

  if (!config) return null

  switch (config?.version) {
    case CONFIG_VERSION:
      return <SmartItemBasicViewV2 entity={entity} />
    default:
      return <SmartItemBasicViewV1 entity={entity} />
  }
})

export default React.memo(SmartItemBasicView)
