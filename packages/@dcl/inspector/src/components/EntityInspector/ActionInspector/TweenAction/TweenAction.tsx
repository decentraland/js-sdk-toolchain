import React, { useCallback, useEffect, useState } from 'react'
import { TweenType, InterpolationType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { Dropdown, TextField, RangeField } from '../../../ui'
import { InfoTooltip } from '../../InfoTooltip'
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

const TweenAction: React.FC<Props> = ({ tween: tweenProp, onUpdateTween }: Props) => {
  const [tween, setTween] = useState(tweenProp)
  const [endPosition, setEndPosition] = useState(tween.end)

  useEffect(() => {
    if (!recursiveCheck(tween, tweenProp, 2) || !isValidTween(tween)) return
    onUpdateTween(tween)
  }, [tween, onUpdateTween])

  const handleChangeType = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setTween({ ...tween, type: value })
    },
    [tween, setTween]
  )

  const handleChangeEndPosition = useCallback(
    (e: React.ChangeEvent<HTMLElement>, axis: string) => {
      const { value } = e.target as HTMLInputElement
      setEndPosition({ ...endPosition, [axis]: value })
    },
    [endPosition, setTween]
  )

  const handleBlurEndPosition = useCallback(
    (e: React.ChangeEvent<HTMLElement>, axis: string) => {
      const { value } = e.target as HTMLInputElement
      const validValue = isNaN(parseFloat(value)) ? parseFloat('0') : parseFloat(value)
      setTween({ ...tween, end: { ...tween.end, [axis]: validValue } })
      setEndPosition({ ...endPosition, [axis]: validValue.toFixed(2) })
    },
    [tween, setTween]
  )

  const handleChangeRelative = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { checked } = e.target as HTMLInputElement
      setTween({ ...tween, relative: checked })
    },
    [tween, setTween]
  )

  const handleChangeInterpolationType = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setTween({ ...tween, interpolationType: value })
    },
    [tween, setTween]
  )

  const isValidDuration = useCallback((value: string) => {
    return !isNaN(parseInt(value.toString())) && parseInt(value.toString()) > 0
  }, [])

  const handleChangeDurationRange = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { value } = e.target as HTMLInputElement

      if (isValidDuration(value)) {
        setTween({ ...tween, duration: parseInt(value) })
      }
    },
    [tween, setTween, isValidDuration]
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

  return (
    <div className="TweenActionContainer">
      <div className="row">
        <div className="field">
          <label>Select Tween {renderTweenInfo()}</label>
          <Dropdown
            options={[
              { value: '', label: 'Select a Tween Type' },
              ...Object.values(TweenType).map((tweenType) => ({ label: TweenMapOption[tweenType], value: tweenType }))
            ]}
            value={tween.type}
            onChange={handleChangeType}
          />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label>End Position</label>
          <div className="row">
            <TextField
              label="X"
              type="number"
              value={endPosition.x}
              error={isNaN(parseFloat(endPosition.x))}
              onChange={(e) => handleChangeEndPosition(e, 'x')}
              onBlur={(e) => handleBlurEndPosition(e, 'x')}
            />
            <TextField
              label="Y"
              type="number"
              value={endPosition.y}
              error={isNaN(parseFloat(endPosition.y))}
              onChange={(e) => handleChangeEndPosition(e, 'y')}
              onBlur={(e) => handleBlurEndPosition(e, 'y')}
            />
            <TextField
              label="Z"
              type="number"
              value={endPosition.z}
              error={isNaN(parseFloat(endPosition.z))}
              onChange={(e) => handleChangeEndPosition(e, 'z')}
              onBlur={(e) => handleBlurEndPosition(e, 'z')}
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="field inline">
          <input type="checkbox" checked={tween.relative} onChange={handleChangeRelative} />
          <label>Relative {renderRelativeInfo()}</label>
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label>Curve Type {rendeCurveTypeInfo()}</label>
          <Dropdown
            options={[
              { value: '', label: 'Select a Curve Type' },
              ...Object.values(InterpolationType).map((interpolationType) => ({
                label: InterpolationMapOption[interpolationType],
                value: interpolationType
              }))
            ]}
            value={tween.interpolationType}
            onChange={handleChangeInterpolationType}
          />
        </div>
      </div>
      <div className="row">
        <div className="field duration">
          <label>Duration {renderDurationInfo()}</label>
          <RangeField value={tween.duration} onChange={handleChangeDurationRange} isValidValue={isValidDuration} />
        </div>
      </div>
    </div>
  )
}

export default React.memo(TweenAction)
