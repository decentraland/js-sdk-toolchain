import { useCallback, useEffect } from 'react'
import { Tween, TweensType, InterpolationType } from '@dcl/asset-packs'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import { VscQuestion as QuestionIcon, VscTrash as RemoveIcon } from 'react-icons/vsc'
import { Popup } from 'decentraland-ui/dist/components/Popup/Popup'

import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { useArrayState } from '../../../hooks/useArrayState'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { EditorComponentsTypes } from '../../../lib/sdk/components'

import { Block } from '../../Block'
import { Container } from '../../Container'
import { ContextMenu } from '../../ContexMenu'
import { Dropdown } from '../../Dropdown'
import { AddButton } from '../AddButton'
import { RangeField } from '../RangeField'
import { TextField } from '../TextField'
import type { Props } from './types'

import './TweenInspector.css'
import MoreOptionsMenu from '../MoreOptionsMenu'
import { Button } from '../../Button'

export default withSdk<Props>(
  withContextMenu<Props & WithSdkProps>(({ sdk, entity: entityId, contextMenuId }) => {
    const { Tweens } = sdk.components
    const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<EditorComponentsTypes['Tweens']>(
      entityId,
      Tweens
    )
    const { handleAction } = useContextMenu()

    const [tweens, addTweens, modifyTweens, removeTweens] = useArrayState<Tween>(
      componentValue === null ? [] : componentValue.value
    )

    const hasTweens = useHasComponent(entityId, Tweens)

    const areValidTweens = useCallback(
      (updatedTweens: Tween[]) =>
        updatedTweens.length > 0 ? updatedTweens.every((tween) => tween.name && tween.type) : true,
      []
    )

    useEffect(() => {
      if (areValidTweens(tweens)) {
        if (isComponentEqual({ value: tweens })) {
          return
        }

        setComponentValue({ value: [...tweens] })
      }
    }, [tweens])

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entityId, Tweens)
      await sdk.operations.dispatch()
    }, [])

    const handleAddNewTween = useCallback(() => {
      addTweens({
        name: '',
        type: TweensType.MOVE_ITEM,
        start: { x: 0, y: 0, z: 0 },
        end: { x: 0, y: 0, z: 0 },
        relative: true,
        interpolationType: InterpolationType.LINEAR,
        duration: 1
      })
    }, [addTweens])

    const handleRemoveTween = useCallback(
      (e: any, idx: any) => {
        removeTweens(idx)
      },
      [removeTweens]
    )

    const handleChangeName = useCallback(
      (e: any, idx: any) => {
        modifyTweens(idx, { ...tweens[idx], name: e.target.value })
      },
      [tweens, modifyTweens]
    )

    const handleFocusInput = useCallback(() => {}, [])

    const handleChangeType = useCallback(
      (e: any, idx: any) => {
        modifyTweens(idx, { ...tweens[idx], type: e.target.value })
      },
      [tweens, modifyTweens]
    )

    const handleChangeEndPosition = useCallback(
      (e: any, axis: any, idx: any) => {
        modifyTweens(idx, { ...tweens[idx], end: { ...tweens[idx].end, [axis]: e.target.value } })
      },
      [tweens, modifyTweens]
    )

    const handleChangeRelative = useCallback(
      (e: any, idx: any) => {
        modifyTweens(idx, { ...tweens[idx], relative: e.target.checked })
      },
      [tweens, modifyTweens]
    )

    const handleChangeInterpolationType = useCallback(
      (e: any, idx: any) => {
        modifyTweens(idx, { ...tweens[idx], interpolationType: e.target.value })
      },
      [tweens, modifyTweens]
    )

    const handleChangeDuration = useCallback(
      (e: any, idx: any) => {
        modifyTweens(idx, { ...tweens[idx], duration: e.target.value })
      },
      [tweens, modifyTweens]
    )

    if (!hasTweens) {
      return null
    }

    const renderMoreInfo = () => {
      return (
        <Popup
          content={
            <>
              Learn more about this feature in the <a href="">docs</a>.
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
      <Container label="Tween" className="TweenInspector" rightContent={renderMoreInfo()}>
        <ContextMenu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </ContextMenu>
        {tweens.map((tween: Tween, idx: number) => {
          return (
            <Block key={`tween-${idx}`}>
              <div className="row">
                <div className="field">
                  <label>Name</label>
                  <TextField
                    type="text"
                    value={tween.name}
                    onChange={(e) => handleChangeName(e, idx)}
                    onFocus={handleFocusInput}
                    onBlur={handleFocusInput}
                  />
                </div>
                <div className="field">
                  <label>Select Tween {renderTweenInfo()}</label>
                  <Dropdown
                    options={[
                      { value: '', text: 'Select a Tween Type' },
                      ...Object.values(TweensType).map((tweenType) => ({ text: tweenType, value: tweenType }))
                    ]}
                    value={tween.type}
                    onChange={(e) => handleChangeType(e, idx)}
                  />
                </div>
                <MoreOptionsMenu>
                  <Button className="RemoveButton" onClick={(e) => handleRemoveTween(e, idx)}>
                    <RemoveIcon /> Remove Tween
                  </Button>
                </MoreOptionsMenu>
              </div>
              <div className="row">
                <div className="field">
                  <label>End Position</label>
                  <div className="row">
                    <TextField
                      label="X"
                      type="number"
                      value={tween.end.x}
                      onChange={(e) => handleChangeEndPosition(e, 'x', idx)}
                    />
                    <TextField
                      label="Y"
                      type="number"
                      value={tween.end.y}
                      onChange={(e) => handleChangeEndPosition(e, 'y', idx)}
                    />
                    <TextField
                      label="Z"
                      type="number"
                      value={tween.end.z}
                      onChange={(e) => handleChangeEndPosition(e, 'z', idx)}
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <input type="checkbox" checked={tween.relative} onChange={(e) => handleChangeRelative(e, idx)} />
                <label>Relative {renderRelativeInfo()}</label>
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
                    onChange={(e) => handleChangeInterpolationType(e, idx)}
                  />
                </div>
              </div>
              <div className="row">
                <div className="field duration">
                  <label>Duration {renderDurationInfo()}</label>
                  <div className="row">
                    <RangeField value={tween.duration} onChange={(e) => handleChangeDuration(e, idx)} />
                    <TextField type="number" value={tween.duration} onChange={(e) => handleChangeDuration(e, idx)} />
                  </div>
                </div>
              </div>
            </Block>
          )
        })}
        <AddButton onClick={handleAddNewTween}>Add New Trigger Event</AddButton>
      </Container>
    )
  })
)
