import React, { useCallback, useEffect } from 'react'
import { PBPointerEvents_Entry, PBPointerEvents, PBPointerEvents_Info } from '@dcl/ecs'
import cx from 'classnames'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { getComponentValue, useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { CoreComponents } from '../../../lib/sdk/components'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField, CheckboxField, RangeField, Dropdown } from '../../ui'
import type { Props } from './types'
import { useArrayState } from '../../../hooks/useArrayState'
import { DEFAULTS, INPUT_ACTIONS, getDefaultPointerEvent, mapValueToInputAction } from './utils'
import { AddButton } from '../AddButton'

type ChangeEvt = React.ChangeEvent<HTMLInputElement>

export default withSdk<Props>(({ sdk, entity: entityId }) => {
  const { PointerEvents, GltfContainer } = sdk.components

  const hasPointerEvents = useHasComponent(entityId, PointerEvents)
  const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<PBPointerEvents>(
    entityId,
    PointerEvents
  )

  const [pointerEvents, addPointerEvent, updatePointerEvents] = useArrayState<PBPointerEvents_Entry>(
    componentValue === null ? [] : componentValue.pointerEvents
  )

  useEffect(() => {
    if (isComponentEqual({ pointerEvents })) return
    setComponentValue({ pointerEvents })
  }, [pointerEvents])

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entityId, PointerEvents)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entityId, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: CoreComponents.POINTER_EVENTS,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
  }, [])

  const handleStateChange = useCallback(
    (newValue: Partial<PBPointerEvents_Entry>, idx: number) => {
      updatePointerEvents(idx, { ...pointerEvents[idx], ...newValue })
    },
    [pointerEvents, updatePointerEvents]
  )

  const handleEventInfoChange = useCallback(
    (newValue: Partial<PBPointerEvents_Info>, idx: number) => {
      handleStateChange({ eventInfo: { ...pointerEvents[idx].eventInfo, ...newValue } }, idx)
    },
    [pointerEvents, updatePointerEvents]
  )

  const handleAdd = useCallback(() => {
    addPointerEvent(getDefaultPointerEvent())
  }, [])

  if (!hasPointerEvents) return null

  return (
    <Container label="PointerEvents" className={cx('PointerEvents')} onRemoveContainer={handleRemove}>
      {pointerEvents.map(($, idx) => (
        <React.Fragment key={idx}>
          <Block label="Button">
            <Dropdown
              options={INPUT_ACTIONS}
              value={$.eventInfo?.button ?? DEFAULTS.eventInfo.button}
              onChange={(e) => handleEventInfoChange({ button: mapValueToInputAction(e.target.value) }, idx)}
            />
          </Block>
          <Block label="Hover text">
            <TextField
              type="text"
              value={$.eventInfo?.hoverText ?? DEFAULTS.eventInfo.hoverText}
              onChange={(e) => handleEventInfoChange({ hoverText: e.target.value }, idx)}
            />
          </Block>
          <Block label="Max distance">
            <RangeField
              onChange={(e: ChangeEvt) => handleEventInfoChange({ maxDistance: Number(e.target.value) }, idx)}
              value={$.eventInfo?.maxDistance ?? DEFAULTS.eventInfo.maxDistance}
            />
          </Block>
          <Block label="Show feedback">
            <CheckboxField
              checked={!!$.eventInfo?.showFeedback ?? DEFAULTS.eventInfo.showFeedback}
              onChange={(e) => handleEventInfoChange({ showFeedback: !!e.target.checked }, idx)}
            />
          </Block>
        </React.Fragment>
      ))}
      <AddButton onClick={handleAdd}>Add Pointer Event</AddButton>
    </Container>
  )
})
