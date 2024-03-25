import React, { useEffect, useCallback, useMemo } from 'react'
import { Entity, PBTween, PBTweenSequence, TransformType, TweenLoop } from '@dcl/ecs'
import { WithSdkProps, withSdk } from '../../../../hoc/withSdk'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { Block } from '../../../Block'
import { CheckboxField, RangeField } from '../../../ui'

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity }>(({ sdk, entity }) => {
    const { Config, Transform, Tween, TweenSequence } = sdk.components
    const [transformComponent] = useComponentValue<TransformType>(entity, Transform)
    const [tweenComponent, setTweenComponentValue] = useComponentValue<PBTween>(entity, Tween)
    const [tweenSequenceComponent, setTweenSequenceComponentValue] = useComponentValue<PBTweenSequence>(
      entity,
      TweenSequence
    )

    const config = useMemo(() => {
      return Config.get(entity)
    }, [entity])

    const isHorizontal = config.componentName === 'Horizontal Platform'

    useEffect(() => {
      if (tweenComponent?.mode?.$case === 'move' && !tweenComponent.mode.move.start && !tweenComponent.mode.move.end) {
        const end = {
          x: isHorizontal ? transformComponent.position.x + 10 : transformComponent.position.x,
          y: !isHorizontal ? transformComponent.position.y + 10 : transformComponent.position.y,
          z: transformComponent.position.z
        }
        setTweenComponentValue({
          ...tweenComponent,
          mode: {
            $case: 'move',
            move: {
              start: {
                x: transformComponent.position.x,
                y: transformComponent.position.y,
                z: transformComponent.position.z
              },
              end: {
                ...end
              }
            }
          }
        })
      }
    }, [entity, tweenComponent, transformComponent, setTweenComponentValue])

    const handleTweenChangeDistance = useCallback(
      (e: React.ChangeEvent<HTMLElement>, isHorizontal: boolean) => {
        const { value } = e.target as HTMLInputElement
        const distance = parseFloat(value)
        if (tweenComponent.mode?.$case === 'move') {
          const end = {
            x: isHorizontal ? transformComponent.position.x + distance : transformComponent.position.x,
            y: !isHorizontal ? transformComponent.position.y + distance : transformComponent.position.y,
            z: transformComponent.position.z
          }

          setTweenComponentValue({
            ...tweenComponent,
            mode: {
              $case: 'move',
              move: {
                start: {
                  x: transformComponent.position.x,
                  y: transformComponent.position.y,
                  z: transformComponent.position.z
                },
                end: {
                  ...end
                }
              }
            }
          })
        }
      },
      [tweenComponent, transformComponent, setTweenComponentValue]
    )

    const handleTweenChangeDuration = useCallback(
      (e: React.ChangeEvent<HTMLElement>) => {
        const { value } = e.target as HTMLInputElement
        const duration = parseFloat(value) * 1000
        setTweenComponentValue({ ...tweenComponent, duration })
      },
      [tweenComponent, setTweenComponentValue]
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
