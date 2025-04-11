import React, { useEffect, useCallback, useMemo } from 'react'
import { Entity, PBTween, TweenLoop } from '@dcl/ecs'
import { Action, ActionPayload, ActionType, getJson } from '@dcl/asset-packs'
import { WithSdkProps, withSdk } from '../../../../hoc/withSdk'
import { useArrayState } from '../../../../hooks/useArrayState'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { Block } from '../../../Block'
import { CheckboxField, RangeField } from '../../../ui'
import { getPartialPayload } from '../../ActionInspector/utils'

type TweenAction = [number, Action]
type TweenActionsMap = Map<string, TweenAction>

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity }>(({ sdk, entity }) => {
    const { Actions, Config, Transform, Tween, TweenSequence } = sdk.components
    const [tweenComponent, setTweenComponentValue, isTweenComponentEqual] = useComponentValue(entity, Tween)
    const [tweenSequenceComponent, setTweenSequenceComponentValue] = useComponentValue(entity, TweenSequence)
    const [actionComponent, setActionComponentValue, isActionComponentEqual] = useComponentValue(entity, Actions)
    const [actions, _, modifyAction] = useArrayState<Action>(actionComponent === null ? [] : actionComponent.value)

    const config = useMemo(() => Config.get(entity), [entity])
    const isHorizontal = config.componentName === 'Horizontal Platform'

    const availableTweenActions: TweenActionsMap = useMemo(() => {
      const mappedActions = new Map<string, TweenAction>()

      for (let actionIdx = 0; actionIdx < actions.length; actionIdx++) {
        const action = actions[actionIdx]

        if (action.type === 'start_tween') {
          if (action.name === 'Tween to Start') {
            mappedActions.set('start', [actionIdx, action])
          } else if (action.name === 'Tween to End') {
            mappedActions.set('end', [actionIdx, action])
          }
        }
      }

      return mappedActions
    }, [actions])

    useEffect(() => {
      if (!actionComponent) return

      if (!isActionComponentEqual({ ...actionComponent, value: actions })) {
        setActionComponentValue({ ...actionComponent, value: [...actions] })
      }
    }, [actionComponent, actions, isActionComponentEqual, setActionComponentValue])

    const handleUpdateActionsDistance = useCallback(
      (distance: number) => {
        const updateTweenAction = (type: 'start' | 'end', distance: number) => {
          const actionEntry = availableTweenActions.get(type)
          if (!actionEntry) return

          const [actionIdx, action] = actionEntry
          const payload = getPartialPayload<ActionType.START_TWEEN>(action)
          const direction = type === 'start' ? -1 : 1

          modifyAction(actionIdx, {
            ...action,
            jsonPayload: getJson<ActionType.START_TWEEN>({
              ...payload,
              end: {
                x: isHorizontal ? distance * direction : 0,
                y: !isHorizontal ? distance * direction : 0,
                z: 0
              }
            } as ActionPayload<ActionType.START_TWEEN>)
          })
        }

        updateTweenAction('start', distance)
        updateTweenAction('end', distance)
      },
      [availableTweenActions, modifyAction, isHorizontal]
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
      if (!tweenComponent || tweenComponent.mode?.$case !== 'move') return

      const transformComponent = Transform.get(entity)
      const start = {
        x: transformComponent.position.x ?? 0,
        y: transformComponent.position.y ?? 0,
        z: transformComponent.position.z ?? 0
      }

      let distance = 10

      // Calculate distance if start and end points exist
      if (tweenComponent.mode.move.start && tweenComponent.mode.move.end) {
        distance = isHorizontal
          ? tweenComponent.mode.move.end.x - tweenComponent.mode.move.start.x
          : tweenComponent.mode.move.end.y - tweenComponent.mode.move.start.y
      }

      const end = {
        x: isHorizontal ? start.x + distance : start.x,
        y: !isHorizontal ? start.y + distance : start.y,
        z: start.z
      }

      const newTweenComponent = {
        ...tweenComponent,
        mode: { $case: 'move', move: { start, end } }
      }

      if (!isTweenComponentEqual(newTweenComponent as PBTween)) {
        setTweenComponentValue(newTweenComponent as PBTween)
        handleUpdateActionsDistance(distance)
      }
    }, [
      entity,
      tweenComponent,
      setTweenComponentValue,
      handleUpdateActionsDistance,
      isHorizontal,
      Transform,
      isTweenComponentEqual
    ])

    const handleTweenChangeDistance = useCallback(
      (e: React.ChangeEvent<HTMLElement>) => {
        if (!tweenComponent || tweenComponent.mode?.$case !== 'move') return

        const { value } = e.target as HTMLInputElement
        const distance = parseFloat(value)

        const transformComponent = Transform.get(entity)
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
      },
      [tweenComponent, setTweenComponentValue, handleUpdateActionsDistance, entity, Transform, isHorizontal]
    )

    const handleTweenChangeDuration = useCallback(
      (e: React.ChangeEvent<HTMLElement>) => {
        if (!tweenComponent) return

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
        if (!tweenComponent) return

        const { checked } = e.target as HTMLInputElement
        setTweenComponentValue({ ...tweenComponent, playing: checked })
      },
      [tweenComponent, setTweenComponentValue]
    )

    const handleTweenChangeLoop = useCallback(
      (e: React.ChangeEvent<HTMLElement>) => {
        if (!tweenSequenceComponent) return

        const { checked } = e.target as HTMLInputElement
        setTweenSequenceComponentValue({
          ...tweenSequenceComponent,
          loop: checked ? TweenLoop.TL_YOYO : undefined
        })
      },
      [tweenSequenceComponent, setTweenSequenceComponentValue]
    )

    const distance = useMemo(() => {
      if (tweenComponent?.mode?.$case !== 'move') return 0

      return isHorizontal
        ? (tweenComponent.mode.move.end?.x ?? 0) - (tweenComponent.mode.move.start?.x ?? 0)
        : (tweenComponent.mode.move.end?.y ?? 0) - (tweenComponent.mode.move.start?.y ?? 0)
    }, [tweenComponent, isHorizontal])

    const duration = tweenComponent?.duration ?? 0
    const isPlaying = tweenComponent?.playing ?? false
    const isLooping = tweenSequenceComponent?.loop === TweenLoop.TL_YOYO

    return (
      <>
        <Block>
          <RangeField
            step="0.1"
            label={isHorizontal ? 'Distance' : 'Height'}
            value={distance}
            onChange={handleTweenChangeDistance}
          />
        </Block>
        <Block>
          <RangeField step="1" label="Duration" value={duration / 1000} onChange={handleTweenChangeDuration} />
        </Block>
        <Block>
          <CheckboxField label="Auto Start" checked={isPlaying} onChange={handleTweenChangeAutoStart} />
          <CheckboxField label="Loop" checked={isLooping} onChange={handleTweenChangeLoop} />
        </Block>
      </>
    )
  })
)
