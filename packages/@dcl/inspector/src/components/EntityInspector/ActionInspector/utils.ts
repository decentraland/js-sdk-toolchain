import {
  Action,
  ActionPayload,
  ActionType,
  InterpolationType,
  TweenType,
  getJson,
  getPayload,
  Font,
  TextAlignMode
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
        textAlign: TextAlignMode.TAM_MIDDLE_CENTER
      })
    }
    default: {
      return '{}'
    }
  }
}
