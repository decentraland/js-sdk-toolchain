import React, { useEffect, useCallback, useMemo } from 'react'
import { Entity, PBTween, PBTweenSequence, TransformType, TweenLoop } from '@dcl/ecs'
import { Action, ActionPayload, ActionType, getJson } from '@dcl/asset-packs'
import { WithSdkProps, withSdk } from '../../../../hoc/withSdk'
import { useArrayState } from '../../../../hooks/useArrayState'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { EditorComponentsTypes } from '../../../../lib/sdk/components'
import { Block } from '../../../Block'
import { CheckboxField, RangeField } from '../../../ui'
import { getPartialPayload } from '../../ActionInspector/utils'

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity }>(({ sdk, entity }) => {
    const { Actions, Config, Transform, Tween, TweenSequence } = sdk.components
    const [transformComponent] = useComponentValue<TransformType>(entity, Transform)
    const [tweenComponent, setTweenComponentValue, isTweenComponentEqual] = useComponentValue<PBTween>(entity, Tween)
    const [tweenSequenceComponent, setTweenSequenceComponentValue] = useComponentValue<PBTweenSequence>(
      entity,
      TweenSequence
    )
    const [actionComponent, setActionComponentValue, isActionComponentEqual] = useComponentValue<
      EditorComponentsTypes['Actions']
    >(entity, Actions)
    const [actions, _, modifyAction] = useArrayState<Action>(actionComponent === null ? [] : actionComponent.value)

    const config = useMemo(() => {
      return Config.get(entity)
    }, [entity])

    const isHorizontal = config.componentName === 'Horizontal Platform'

    const availableTweenActions: Map<string, [number, Action]> = useMemo(() => {
      return actions.reduce((mappedActions, action, actionIdx) => {
        if (action.type === 'start_tween') {
          if (action.name === 'Tween to Start') {
            mappedActions.set('start', [actionIdx, action])
          } else if (action.name === 'Tween to End') {
            mappedActions.set('end', [actionIdx, action])
          }
        }
        return mappedActions
      }, new Map<string, [number, Action]>())
    }, [actions])

    useEffect(() => {
      const current = Actions.get(entity)
      if (!isActionComponentEqual({ ...current, value: actions })) {
        setActionComponentValue({ ...current, value: [...actions] })
      }
    }, [entity, actions, isActionComponentEqual])

    const handleUpdateActionsDistance = useCallback(
      (distance: number) => {
        if (!!availableTweenActions.get('start')) {
          const [startActionIdx, tweenToStartAction] = availableTweenActions.get('start') as [number, Action]
          const payloadStart = getPartialPayload<ActionType.START_TWEEN>(tweenToStartAction)
          modifyAction(startActionIdx, {
            ...tweenToStartAction,
            jsonPayload: getJson<ActionType.START_TWEEN>({
              ...payloadStart,
              end: { x: isHorizontal ? distance * -1 : 0, y: !isHorizontal ? distance * -1 : 0, z: 0 }
            } as ActionPayload<ActionType.START_TWEEN>)
          })
        }

        if (!!availableTweenActions.get('end')) {
          const [endActionIdx, tweenToEndAction] = availableTweenActions.get('end') as [number, Action]
          const payloadEnd = getPartialPayload<ActionType.START_TWEEN>(tweenToEndAction)
          modifyAction(endActionIdx, {
            ...tweenToEndAction,
            jsonPayload: getJson<ActionType.START_TWEEN>({
              ...payloadEnd,
              end: { x: isHorizontal ? distance : 0, y: !isHorizontal ? distance : 0, z: 0 }
            } as ActionPayload<ActionType.START_TWEEN>)
          })
        }
      },
      [availableTweenActions, modifyAction]
    )

    const handleUpdateActionsDuration = useCallback(
      (duration: number) => {
        availableTweenActions.forEach(([actionIdx, action]) => {
          const payload = getPartialPayload<ActionType.START_TWEEN>(action)
          modifyAction(actionIdx, {
            ...action,
            jsonPayload: getJson<ActionType.START_TWEEN>({
              ...payload,
              duration
            } as ActionPayload<ActionType.START_TWEEN>)
          })
        })
      },
      [availableTweenActions, modifyAction]
    )

    useEffect(() => {
      const currentTween = Tween.get(entity)
      const start = {
        x: transformComponent.position.x ?? 0,
        y: transformComponent.position.y ?? 0,
        z: transformComponent.position.z ?? 0
      }
      let distance = 10

      if (currentTween?.mode?.$case === 'move') {
        let end = {
          x: isHorizontal ? start.x + distance : start.x,
          y: !isHorizontal ? start.y + distance : start.y,
          z: start.z
        }

        if (!!currentTween.mode.move.start && !!currentTween.mode.move.end) {
          distance = isHorizontal
            ? currentTween.mode.move.end.x - currentTween.mode.move.start.x
            : currentTween.mode.move.end.y - currentTween.mode.move.start.y
          end = {
            x: isHorizontal ? start.x + distance : start.x,
            y: !isHorizontal ? start.y + distance : start.y,
            z: start.z
          }
        }

        if (!isTweenComponentEqual({ ...currentTween, mode: { $case: 'move', move: { start, end } } })) {
          setTweenComponentValue({ ...currentTween, mode: { $case: 'move', move: { start, end } } })
          handleUpdateActionsDistance(distance)
        }
      }
    }, [entity, transformComponent, setTweenComponentValue, handleUpdateActionsDistance])

    const handleTweenChangeDistance = useCallback(
      (e: React.ChangeEvent<HTMLElement>, isHorizontal: boolean) => {
        const { value } = e.target as HTMLInputElement
        const distance = parseFloat(value)
        if (tweenComponent.mode?.$case === 'move') {
          const start = {
            x: transformComponent.position.x,
            y: transformComponent.position.y,
            z: transformComponent.position.z
          }
          const end = {
            x: isHorizontal ? start.x + distance : start.x,
            y: !isHorizontal ? start.y + distance : start.y,
            z: start.z
          }

          setTweenComponentValue({
            ...tweenComponent,
            mode: { $case: 'move', move: { start: { ...start }, end: { ...end } } }
          })
          // Sync Actions distance with the TweenComponent distance
          handleUpdateActionsDistance(distance)
        }
      },
      [tweenComponent, transformComponent, setTweenComponentValue, handleUpdateActionsDistance]
    )

    const handleTweenChangeDuration = useCallback(
      (e: React.ChangeEvent<HTMLElement>) => {
        const { value } = e.target as HTMLInputElement
        const duration = parseFloat(value)
        setTweenComponentValue({ ...tweenComponent, duration: duration * 1000 })
        // Sync Actions duration with the TweenComponent duration
        handleUpdateActionsDuration(duration)
      },
      [tweenComponent, setTweenComponentValue, handleUpdateActionsDuration]
    )

    const handleTweenChangeAutoStart = useCallback(
      (e: React.ChangeEvent<HTMLElement>) => {
        const { checked } = e.target as HTMLInputElement
        setTweenComponentValue({ ...tweenComponent, playing: checked })
      },
      [tweenComponent, setTweenComponentValue]
    )

    const handleTweenChangeLoop = useCallback(
      (e: React.ChangeEvent<HTMLElement>) => {
        const { checked } = e.target as HTMLInputElement
        setTweenSequenceComponentValue({
          ...tweenSequenceComponent,
          loop: checked ? TweenLoop.TL_YOYO : undefined
        })
      },
      [tweenSequenceComponent, setTweenSequenceComponentValue]
    )

    const distance =
      tweenComponent?.mode?.$case === 'move'
        ? isHorizontal
          ? (tweenComponent.mode.move.end?.x ?? 0) - (tweenComponent.mode.move.start?.x ?? 0)
          : (tweenComponent.mode.move.end?.y ?? 0) - (tweenComponent.mode.move.start?.y ?? 0)
        : 0

    const duration = tweenComponent?.duration ?? 0

    return (
      <>
        <Block>
          <RangeField
            step="0.1"
            label={isHorizontal ? 'Distance' : 'Height'}
            value={distance}
            onChange={(e) => handleTweenChangeDistance(e, isHorizontal)}
          />
        </Block>
        <Block>
          <RangeField step="1" label={'Duration'} value={duration / 1000} onChange={handleTweenChangeDuration} />
        </Block>
        <Block>
          <CheckboxField label="Auto Start" checked={tweenComponent.playing} onChange={handleTweenChangeAutoStart} />
          <CheckboxField label="Loop" checked={tweenSequenceComponent.loop === 1} onChange={handleTweenChangeLoop} />
        </Block>
      </>
    )
  })
)
