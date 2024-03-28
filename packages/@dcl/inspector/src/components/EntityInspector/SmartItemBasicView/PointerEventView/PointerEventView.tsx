import React, { useCallback, useEffect } from 'react'
import { Entity, PBPointerEvents, PBPointerEvents_Entry } from '@dcl/ecs'
import { withSdk, WithSdkProps } from '../../../../hoc/withSdk'
import { Block } from '../../../Block'
import { TextField, Dropdown } from '../../../ui'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { useArrayState } from '../../../../hooks/useArrayState'
import { INPUT_ACTIONS, mapValueToInputAction } from '../../PointerEventsInspector/utils'

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity }>(({ sdk, entity }) => {
    const { PointerEvents } = sdk.components
    const [pointerEventComponent, setPointerEventComponentValue, isComponentEqual] = useComponentValue<PBPointerEvents>(
      entity,
      PointerEvents
    )
    const [pointerEvents, , modifyPointerEvent] = useArrayState<PBPointerEvents_Entry>(
      pointerEventComponent === null ? [] : pointerEventComponent.pointerEvents
    )

    useEffect(() => {
      if (isComponentEqual({ pointerEvents })) return
      setPointerEventComponentValue({ pointerEvents })
    }, [pointerEvents])

    const handleHoverTextChange = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
        modifyPointerEvent(0, {
          ...pointerEvents[0],
          eventInfo: {
            ...pointerEvents[0].eventInfo,
            hoverText: value
          }
        })
      },
      [pointerEvents, modifyPointerEvent]
    )

    const handleHoverInteractionChange = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
        modifyPointerEvent(0, {
          ...pointerEvents[0],
          eventInfo: {
            ...pointerEvents[0].eventInfo,
            button: mapValueToInputAction(value)!
          }
        })
      },
      [pointerEvents, modifyPointerEvent]
    )

    return (
      <>
        <Block>
          <TextField
            label="Hover Text"
            value={pointerEvents[0]?.eventInfo?.hoverText}
            onChange={handleHoverTextChange}
          />
        </Block>
        <Block>
          <Dropdown
            label="Interaction"
            value={pointerEvents[0]?.eventInfo?.button}
            options={INPUT_ACTIONS}
            onChange={handleHoverInteractionChange}
          />
        </Block>
      </>
    )
  })
)
