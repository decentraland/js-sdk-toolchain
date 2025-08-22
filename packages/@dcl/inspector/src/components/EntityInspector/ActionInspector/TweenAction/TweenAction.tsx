import React, { useCallback, useState } from 'react'
import { TweenType, InterpolationType, ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { Block } from '../../../Block'
import { Dropdown, TextField, RangeField, InfoTooltip, CheckboxField } from '../../../ui'
import { isValidTween } from './utils'
import type { Props } from './types'

const TweenMapOption: Record<string, string> = {
  [TweenType.MOVE_ITEM]: 'Move Item',
  [TweenType.ROTATE_ITEM]: 'Rotate Item',
  [TweenType.SCALE_ITEM]: 'Scale Item'
}

const InterpolationMapOption: Record<string, string> = {
  [InterpolationType.LINEAR]: 'Linear',
  [InterpolationType.EASEINQUAD]: 'Ease in Quad',
  [InterpolationType.EASEOUTQUAD]: 'Ease out Quad',
  [InterpolationType.EASEQUAD]: 'Ease Quad',
  [InterpolationType.EASEINSINE]: 'Ease in Sine',
  [InterpolationType.EASEOUTSINE]: 'Ease out Sine',
  [InterpolationType.EASESINE]: 'Ease in/out Sine',
  [InterpolationType.EASEINEXPO]: 'Ease in Expo',
  [InterpolationType.EASEOUTEXPO]: 'Ease out Expo',
  [InterpolationType.EASEEXPO]: 'Ease in/out Expo',
  [InterpolationType.EASEINELASTIC]: 'Ease in Elastic',
  [InterpolationType.EASEOUTELASTIC]: 'Ease out Elastic',
  [InterpolationType.EASEELASTIC]: 'Ease in/out Elastic',
  [InterpolationType.EASEINBOUNCE]: 'Ease in Bounce',
  [InterpolationType.EASEOUTEBOUNCE]: 'Ease out Bounce',
  [InterpolationType.EASEBOUNCE]: 'Ease in/out Bounce'
}

function parseDuration(value: string | number): string {
  const duration = Number(value)
  return duration > 0 ? duration.toFixed(2) : duration.toString()
}

const TweenAction: React.FC<Props> = ({ tween: tweenProp, onUpdateTween }: Props) => {
  const [tween, setTween] = useState(tweenProp)

  const handleUpdate = useCallback(
    (_tween: Partial<ActionPayload<ActionType.START_TWEEN>>) => {
      setTween(_tween)
      if (!recursiveCheck(_tween, tweenProp, 2) || !isValidTween(_tween)) return
      onUpdateTween(_tween)
    },
    [setTween, tweenProp, onUpdateTween]
  )

  const handleChangeType = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      handleUpdate({ ...tween, type: value })
    },
    [tween, handleUpdate]
  )

  const handleChangeEndPosition = useCallback(
    (e: React.ChangeEvent<HTMLElement>, axis: string) => {
      const { value } = e.target as HTMLInputElement
      handleUpdate({ ...tween, end: { ...tween.end, [axis]: value } })
    },
    [tween, handleUpdate]
  )

  const handleBlurEndPosition = useCallback(
    (e: React.ChangeEvent<HTMLElement>, axis: string) => {
      const { value } = e.target as HTMLInputElement
      const validValue = isNaN(parseFloat(value)) ? parseFloat('0') : parseFloat(value)
      handleUpdate({ ...tween, end: { ...tween.end, [axis]: validValue } })
    },
    [tween, handleUpdate]
  )

  const handleChangeRelative = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { checked } = e.target as HTMLInputElement
      handleUpdate({ ...tween, relative: checked })
    },
    [tween, handleUpdate]
  )

  const handleChangeInterpolationType = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      handleUpdate({ ...tween, interpolationType: value })
    },
    [tween, handleUpdate]
  )

  const isValidDuration = useCallback((value: string) => {
    return !isNaN(parseInt(value.toString())) && parseFloat(value.toString()) > 0
  }, [])

  const handleChangeDurationRange = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { value } = e.target as HTMLInputElement

      if (isValidDuration(value)) {
        handleUpdate({ ...tween, duration: parseDuration(value) })
      }
    },
    [tween, handleUpdate, isValidDuration]
  )

  const renderTweenInfo = () => {
    return (
      <InfoTooltip
        text={"Use the next tween type to change the item's position, scale, or rotation over a period of time."}
        link="https://docs.decentraland.org/creator/smart-items/#moving-rotating-or-scaling"
      />
    )
  }

  const renderRelativeInfo = () => {
    return (
      <InfoTooltip text="Relative tweens modify an item's position, scale, or rotation in relation to its current state, while absolute tweens fix them relative to the world." />
    )
  }

  const rendeCurveTypeInfo = () => {
    return <InfoTooltip text="Tweens can follow different Curve Types that affect the rate of change over time." />
  }

  const renderDurationInfo = () => {
    return <InfoTooltip text="The duration set how long the whole movement should take in seconds." />
  }

  const getLabel = useCallback(() => {
    switch (tween.type) {
      case TweenType.ROTATE_ITEM:
        return 'End Rotation'
      case TweenType.SCALE_ITEM:
        return 'End Scale'
      default:
        return 'End Position'
    }
  }, [tween.type])

  return (
    <div className="TweenActionContainer">
      <div className="row">
        <Dropdown
          label={<>Select Tween {renderTweenInfo()}</>}
          placeholder="Select a Tween Type"
          options={[
            ...Object.values(TweenType).map((tweenType) => ({ label: TweenMapOption[tweenType], value: tweenType }))
          ]}
          value={tween.type}
          onChange={handleChangeType}
        />
      </div>
      <Block label={getLabel()}>
        <TextField
          leftLabel="X"
          type="number"
          value={tween.end.x}
          error={isNaN(parseFloat(tween.end.x))}
          onChange={(e) => handleChangeEndPosition(e, 'x')}
          onBlur={(e) => handleBlurEndPosition(e, 'x')}
          autoSelect
        />
        <TextField
          leftLabel="Y"
          type="number"
          value={tween.end.y}
          error={isNaN(parseFloat(tween.end.y))}
          onChange={(e) => handleChangeEndPosition(e, 'y')}
          onBlur={(e) => handleBlurEndPosition(e, 'y')}
          autoSelect
        />
        <TextField
          leftLabel="Z"
          type="number"
          value={tween.end.z}
          error={isNaN(parseFloat(tween.end.z))}
          onChange={(e) => handleChangeEndPosition(e, 'z')}
          onBlur={(e) => handleBlurEndPosition(e, 'z')}
          autoSelect
        />
      </Block>
      <div className="row">
        <CheckboxField
          checked={tween.relative}
          label={<>Relative {renderRelativeInfo()}</>}
          onChange={handleChangeRelative}
        />
      </div>
      <div className="row">
        <Dropdown
          label={<>Curve Type {rendeCurveTypeInfo()}</>}
          placeholder="Select a Curve Type"
          options={[
            ...Object.values(InterpolationType).map((interpolationType) => ({
              label: InterpolationMapOption[interpolationType],
              value: interpolationType
            }))
          ]}
          value={tween.interpolationType}
          onChange={handleChangeInterpolationType}
        />
      </div>
      <div className="row">
        <RangeField
          label={<>Duration {renderDurationInfo()}</>}
          value={tween.duration}
          onChange={handleChangeDurationRange}
          isValidValue={isValidDuration}
          step={0.25}
        />
      </div>
    </div>
  )
}

export default React.memo(TweenAction)
