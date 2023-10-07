import React, { useCallback, useEffect, useState } from 'react'
import { TweenType, InterpolationType } from '@dcl/asset-packs'
import { VscQuestion as QuestionIcon } from 'react-icons/vsc'
import { Popup } from 'decentraland-ui/dist/components/Popup/Popup'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { Dropdown } from '../../../Dropdown'
import { RangeField } from '../../RangeField'
import { TextField } from '../../TextField'
import { isValidTween } from './utils'
import type { Props } from './types'

const TweenAction: React.FC<Props> = ({ tween: tweenProp, onUpdateTween }: Props) => {
  const [tween, setTween] = useState(tweenProp)
  const [endPosition, setEndPosition] = useState(tween.end)
  const [duration, setDuration] = useState(tween.duration)

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

  const handleChangeDuration = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { value } = e.target as HTMLInputElement
      setDuration(value)
    },
    [setDuration]
  )

  const handleChangeDurationRange = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { value } = e.target as HTMLInputElement
      const parsedValue = parseInt(value)
      if (!isNaN(parsedValue) && parsedValue >= 0) {
        setTween({ ...tween, duration: parsedValue })
      }

      setDuration(parsedValue.toString())
    },
    [tween, setTween, setDuration]
  )

  const renderTweenInfo = () => {
    return (
      <Popup
        content={
          <>
            Learn more about the tweens type in the <a href="">docs</a>.
          </>
        }
        trigger={<QuestionIcon size={16} />}
        position="right center"
        on="hover"
        hideOnScroll
        hoverable
      />
    )
  }

  const renderRelativeInfo = () => {
    return (
      <Popup
        content={
          <>
            Learn more about the relative in the <a href="">docs</a>.
          </>
        }
        trigger={<QuestionIcon size={16} />}
        position="right center"
        on="hover"
        hideOnScroll
        hoverable
      />
    )
  }

  const rendeCurveTypeInfo = () => {
    return (
      <Popup
        content={
          <>
            Learn more about the curve type in the <a href="">docs</a>.
          </>
        }
        trigger={<QuestionIcon size={16} />}
        position="right center"
        on="hover"
        hideOnScroll
        hoverable
      />
    )
  }

  const renderDurationInfo = () => {
    return (
      <Popup
        content={
          <>
            Learn more about the duration in the <a href="">docs</a>.
          </>
        }
        trigger={<QuestionIcon size={16} />}
        position="right center"
        on="hover"
        hideOnScroll
        hoverable
      />
    )
  }

  return (
    <div className="TweenActionContainer">
      <div className="row">
        <div className="field">
          <label>Select Tween {renderTweenInfo()}</label>
          <Dropdown
            options={[
              { value: '', text: 'Select a Tween Type' },
              ...Object.values(TweenType).map((tweenType) => ({ text: tweenType, value: tweenType }))
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
              { value: '', text: 'Select a Curve Type' },
              ...Object.values(InterpolationType).map((interpolationType) => ({
                text: interpolationType,
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
          <div className="row">
            <RangeField value={duration || 0} onChange={handleChangeDuration} onBlur={handleChangeDurationRange} />
            <TextField
              type="number"
              value={duration}
              error={isNaN(parseInt(duration)) || parseInt(duration) < 0}
              onChange={handleChangeDuration}
              onBlur={handleChangeDurationRange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(TweenAction)
