import { useCallback } from 'react'
import { TweensType, InterpolationType } from '@dcl/asset-packs'
import { VscQuestion as QuestionIcon } from 'react-icons/vsc'
import { Popup } from 'decentraland-ui/dist/components/Popup/Popup'

import { Dropdown } from '../../../Dropdown'
import { RangeField } from '../../RangeField'
import { TextField } from '../../TextField'
import type { Props } from './types'

export const TweenAction = ({ tween, onUpdateTween }: Props) => {
  const handleChangeType = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdateTween({ ...tween, type: value })
    },
    [tween, onUpdateTween]
  )

  const handleChangeEndPosition = useCallback(
    (e: React.ChangeEvent<HTMLElement>, axis: string) => {
      const { value } = e.target as HTMLInputElement
      onUpdateTween({ ...tween, end: { ...tween.end, [axis]: value } })
    },
    [tween, onUpdateTween]
  )

  const handleChangeRelative = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { checked } = e.target as HTMLInputElement
      onUpdateTween({ ...tween, relative: checked })
    },
    [tween, onUpdateTween]
  )

  const handleChangeInterpolationType = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdateTween({ ...tween, interpolationType: value })
    },
    [tween, onUpdateTween]
  )

  const handleChangeDuration = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { value } = e.target as HTMLInputElement
      onUpdateTween({ ...tween, duration: value })
    },
    [tween, onUpdateTween]
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
              ...Object.values(TweensType).map((tweenType) => ({ text: tweenType, value: tweenType }))
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
            <TextField label="X" type="number" value={tween.end.x} onChange={(e) => handleChangeEndPosition(e, 'x')} />
            <TextField label="Y" type="number" value={tween.end.y} onChange={(e) => handleChangeEndPosition(e, 'y')} />
            <TextField label="Z" type="number" value={tween.end.z} onChange={(e) => handleChangeEndPosition(e, 'z')} />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="field relative">
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
            <RangeField value={tween.duration} onChange={handleChangeDuration} />
            <TextField type="number" value={tween.duration} onChange={handleChangeDuration} />
          </div>
        </div>
      </div>
    </div>
  )
}
