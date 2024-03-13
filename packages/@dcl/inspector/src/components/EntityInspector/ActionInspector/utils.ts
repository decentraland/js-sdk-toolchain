import {
  Action,
  ActionPayload,
  ActionType,
  InterpolationType,
  TweenType,
  getJson,
  getPayload,
  Font,
  AlignMode
} from '@dcl/asset-packs'
import { EditorComponentsTypes } from '../../../lib/sdk/components'

export function isStates(maybeStates: any): maybeStates is EditorComponentsTypes['States'] {
  return !!maybeStates && 'value' in maybeStates && Array.isArray(maybeStates.value)
}

export function getPartialPayload<T extends ActionType>(action: Action) {
  return getPayload<T>(action) as Partial<ActionPayload<T>>
}

export function getDefaultPayload(type: string) {
  switch (type) {
    case ActionType.SET_VISIBILITY: {
      return getJson<ActionType.SET_VISIBILITY>({
        visible: true
      })
    }
    case ActionType.START_TWEEN: {
      return getJson<ActionType.START_TWEEN>({
        type: TweenType.MOVE_ITEM,
        end: {
          x: 0,
          y: 0,
          z: 0
        },
        relative: true,
        interpolationType: InterpolationType.LINEAR,
        duration: 1
      })
    }
    case ActionType.TELEPORT_PLAYER: {
      return getJson<ActionType.TELEPORT_PLAYER>({
        x: 0,
        y: 0
      })
    }
    case ActionType.MOVE_PLAYER: {
      return getJson<ActionType.MOVE_PLAYER>({
        position: {
          x: 0,
          y: 0,
          z: 0
        }
      })
    }
    case ActionType.SHOW_TEXT: {
      return getJson<ActionType.SHOW_TEXT>({
        text: '',
        hideAfterSeconds: 5,
        font: Font.F_SANS_SERIF,
        fontSize: 10,
        textAlign: AlignMode.TAM_MIDDLE_CENTER
      })
    }
    case ActionType.START_DELAY: {
      return getJson<ActionType.START_DELAY>({
        actions: [],
        timeout: 5
      })
    }
    case ActionType.START_LOOP: {
      return getJson<ActionType.START_LOOP>({
        actions: [],
        interval: 5
      })
    }
    case ActionType.STOP_DELAY:
    case ActionType.STOP_LOOP: {
      return getJson<typeof type>({
        action: ''
      })
    }
    case ActionType.FOLLOW_PLAYER: {
      return getJson<ActionType.FOLLOW_PLAYER>({
        speed: 1,
        x: true,
        y: true,
        z: true,
        minDistance: 0.5
      })
    }
    case ActionType.INCREMENT_COUNTER: {
      return getJson<ActionType.INCREMENT_COUNTER>({
        amount: 1
      })
    }
    case ActionType.DECREASE_COUNTER: {
      return getJson<ActionType.DECREASE_COUNTER>({
        amount: 1
      })
    }
    default: {
      return '{}'
    }
  }
}
