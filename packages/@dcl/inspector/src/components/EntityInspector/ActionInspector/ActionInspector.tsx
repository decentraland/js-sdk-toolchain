import { useCallback, useEffect, useMemo, useState } from 'react'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { AvatarAnchorPointType } from '@dcl/ecs'
import {
  Action,
  ActionType,
  getActionTypes,
  getJson,
  getPayload,
  ActionPayload,
  getActionSchema,
  ComponentName
} from '@dcl/asset-packs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { AnimationGroup } from '@babylonjs/core'

import { withSdk } from '../../../hoc/withSdk'
import { getComponentValue, useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useChange } from '../../../hooks/sdk/useChange'
import { useArrayState } from '../../../hooks/useArrayState'
import { analytics, Event } from '../../../lib/logic/analytics'
import { EditorComponentsTypes } from '../../../lib/sdk/components'
import { getAssetByModel } from '../../../lib/logic/catalog'

import { Block } from '../../Block'
import { Container } from '../../Container'
import { Dropdown, TextField } from '../../ui'
import MoreOptionsMenu from '../MoreOptionsMenu'
import { AddButton } from '../AddButton'
import { Button } from '../../Button'
import { InfoTooltip } from '../../ui/InfoTooltip'

import { PlaySoundAction } from './PlaySoundAction'
import { TweenAction } from './TweenAction'
import { isValidTween } from './TweenAction/utils'
import { PlayAnimationAction } from './PlayAnimationAction'
import { SetVisibilityAction } from './SetVisibilityAction'
import { PlayVideoStreamAction } from './PlayVideoStreamAction'
import { PlayAudioStreamAction } from './PlayAudioStreamAction'
import { TeleportPlayerAction } from './TeleportPlayerAction'
import { MovePlayerAction } from './MovePlayerAction'
import { PlayDefaultEmoteAction } from './PlayDefaultEmoteAction'
import { PlayCustomEmoteAction } from './PlayCustomEmoteAction'
import { OpenLinkAction } from './OpenLinkAction'
import { ShowTextAction } from './ShowTextAction'
import { DelayAction } from './DelayAction'
import { LoopAction } from './LoopAction'
import { CloneEntityAction } from './CloneEntityAction'
import { ShowImageAction } from './ShowImageAction'
import { FollowPlayerAction } from './FollowPlayerAction'
import TriggerProximityAction from './TriggerProximityAction/TriggerProximityAction'
import SetPositionAction from './SetPositionAction/SetPositionAction'
import { SetRotationAction } from './SetRotationAction'
import { SetScaleAction } from './SetScaleAction'
import { RandomAction } from './RandomAction'
import { BatchAction } from './BatchAction'
import { getDefaultPayload, getPartialPayload, isStates } from './utils'
import { Props } from './types'

import './ActionInspector.css'

const ActionMapOption: Record<string, string> = {
  [ActionType.PLAY_ANIMATION]: 'Play Animation',
  [ActionType.STOP_ANIMATION]: 'Stop Animation',
  [ActionType.SET_STATE]: 'Set State',
  [ActionType.START_TWEEN]: 'Start Tween',
  [ActionType.SET_COUNTER]: 'Set Counter',
  [ActionType.INCREMENT_COUNTER]: 'Increment Counter',
  [ActionType.DECREASE_COUNTER]: 'Decrease Counter',
  [ActionType.PLAY_SOUND]: 'Play Sound',
  [ActionType.STOP_SOUND]: 'Stop Sound',
  [ActionType.SET_VISIBILITY]: 'Set Visibility',
  [ActionType.ATTACH_TO_PLAYER]: 'Attach to Player',
  [ActionType.DETACH_FROM_PLAYER]: 'Detach from Player',
  [ActionType.TELEPORT_PLAYER]: 'Teleport Player',
  [ActionType.MOVE_PLAYER]: 'Move Player',
  [ActionType.PLAY_DEFAULT_EMOTE]: 'Play Emote',
  [ActionType.PLAY_CUSTOM_EMOTE]: 'Play Custom Emote',
  [ActionType.OPEN_LINK]: 'Open Link',
  [ActionType.PLAY_AUDIO_STREAM]: 'Play Audio Stream',
  [ActionType.STOP_AUDIO_STREAM]: 'Stop Audio Stream',
  [ActionType.PLAY_VIDEO_STREAM]: 'Play Video Stream',
  [ActionType.STOP_VIDEO_STREAM]: 'Stop Video Stream',
  [ActionType.SHOW_TEXT]: 'Show Text',
  [ActionType.HIDE_TEXT]: 'Hide Text',
  [ActionType.START_DELAY]: 'Start Delay',
  [ActionType.STOP_DELAY]: 'Stop Delay',
  [ActionType.START_LOOP]: 'Start Loop',
  [ActionType.STOP_LOOP]: 'Stop Loop',
  [ActionType.CLONE_ENTITY]: 'Clone',
  [ActionType.REMOVE_ENTITY]: 'Remove',
  [ActionType.SHOW_IMAGE]: 'Show Image',
  [ActionType.HIDE_IMAGE]: 'Hide Image',
  [ActionType.FOLLOW_PLAYER]: 'Follow Player',
  [ActionType.STOP_FOLLOWING_PLAYER]: 'Stop Following Player',
  [ActionType.MOVE_PLAYER_HERE]: 'Move Player Here',
  [ActionType.DAMAGE]: 'Damage',
  [ActionType.PLACE_ON_PLAYER]: 'Place On Player',
  [ActionType.ROTATE_AS_PLAYER]: 'Rotate As Player',
  [ActionType.PLACE_ON_CAMERA]: 'Place On Camera',
  [ActionType.ROTATE_AS_CAMERA]: 'Rotate As Camera',
  [ActionType.SET_POSITION]: 'Set Position',
  [ActionType.SET_ROTATION]: 'Set Rotation',
  [ActionType.SET_SCALE]: 'Set Scale',
  [ActionType.RANDOM]: 'Random Action',
  [ActionType.BATCH]: 'Batch Actions',
  [ActionType.HEAL_PLAYER]: 'Heal Player'
}

export default withSdk<Props>(({ sdk, entity: entityId }) => {
  const { Actions, States, Counter, GltfContainer } = sdk.components
  const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<EditorComponentsTypes['Actions']>(
    entityId,
    Actions
  )
  const entity = sdk.sceneContext.getEntityOrNull(entityId)
  const [actions, addAction, modifyAction, removeAction] = useArrayState<Action>(
    componentValue === null ? [] : componentValue.value
  )
  const [isFocused, setIsFocused] = useState(false)
  const [animations, setAnimations] = useState<AnimationGroup[]>([])
  const [states, setStates] = useState<string[]>(States.getOrNull(entityId)?.value || [])

  const hasActions = useHasComponent(entityId, Actions)
  const hasStates = useHasComponent(entityId, States)
  const hasCounter = useHasComponent(entityId, Counter)

  useChange(
    (event, sdk) => {
      if (
        event.entity === entityId &&
        event.component?.componentId === sdk.components.States.componentId &&
        isStates(event.value)
      ) {
        const states = event.value
        setStates(states.value)
      }
    },
    [entityId]
  )

  useEffect(() => {
    if (entity) {
      entity
        .onGltfContainerLoaded()
        .then((gltfAssetContainer) => {
          setAnimations([...gltfAssetContainer.animationGroups])
        })
        .catch(() => {})
    }
  }, [entity])

  const isValidAction = useCallback(
    (action: Action) => {
      if (!action.type || !action.name) {
        return false
      }
      switch (action.type) {
        case ActionType.PLAY_ANIMATION: {
          const payload = getPartialPayload<ActionType.PLAY_ANIMATION>(action)
          return !!payload.animation
        }
        case ActionType.SET_STATE: {
          const payload = getPartialPayload<ActionType.SET_STATE>(action)
          return !!payload.state
        }
        case ActionType.START_TWEEN: {
          const payload = getPartialPayload<ActionType.START_TWEEN>(action)
          return !!payload && isValidTween(payload)
        }
        case ActionType.SET_COUNTER: {
          const payload = getPartialPayload<ActionType.SET_COUNTER>(action)
          return !!payload.counter && !isNaN(payload.counter)
        }
        case ActionType.INCREMENT_COUNTER: {
          const payload = getPartialPayload<ActionType.INCREMENT_COUNTER>(action)
          return !!payload
        }
        case ActionType.DECREASE_COUNTER: {
          const payload = getPartialPayload<ActionType.DECREASE_COUNTER>(action)
          return !!payload
        }
        case ActionType.TELEPORT_PLAYER: {
          const payload = getPartialPayload<ActionType.TELEPORT_PLAYER>(action)
          return (
            !!payload &&
            typeof payload.x === 'number' &&
            !isNaN(payload.x) &&
            typeof payload.y === 'number' &&
            !isNaN(payload.y)
          )
        }
        case ActionType.MOVE_PLAYER: {
          const payload = getPartialPayload<ActionType.MOVE_PLAYER>(action)
          return (
            !!payload &&
            typeof payload.position?.x === 'number' &&
            !isNaN(payload.position?.x) &&
            typeof payload.position?.y === 'number' &&
            !isNaN(payload.position?.y) &&
            typeof payload.position?.z === 'number' &&
            !isNaN(payload.position?.z)
          )
        }
        case ActionType.PLAY_DEFAULT_EMOTE: {
          const payload = getPartialPayload<ActionType.PLAY_DEFAULT_EMOTE>(action)
          return !!payload && typeof payload.emote === 'string' && payload.emote.length > 0
        }
        case ActionType.PLAY_CUSTOM_EMOTE: {
          const payload = getPartialPayload<ActionType.PLAY_CUSTOM_EMOTE>(action)
          return !!payload && typeof payload.src === 'string' && payload.src.length > 0
        }
        case ActionType.OPEN_LINK: {
          const payload = getPartialPayload<ActionType.OPEN_LINK>(action)
          return !!payload && typeof payload.url === 'string' && payload.url.length > 0
        }
        case ActionType.CLONE_ENTITY: {
          const payload = getPartialPayload<ActionType.CLONE_ENTITY>(action)
          return (
            !!payload &&
            typeof payload.position?.x === 'number' &&
            !isNaN(payload.position?.x) &&
            typeof payload.position?.y === 'number' &&
            !isNaN(payload.position?.y) &&
            typeof payload.position?.z === 'number' &&
            !isNaN(payload.position?.z)
          )
        }
        default: {
          try {
            const payload = getPartialPayload(action)
            const schema = getActionSchema(sdk.engine as any, action.type)
            const buffer = new ReadWriteByteBuffer()
            schema.serialize(payload, buffer)
            schema.deserialize(buffer)
            return true
          } catch (error) {
            return false
          }
        }
      }
    },
    [sdk]
  )

  const areValidActions = useCallback(
    (updatedActions: Action[]) => updatedActions.length > 0 && updatedActions.every(isValidAction),
    []
  )

  useEffect(() => {
    if (areValidActions(actions)) {
      const current = sdk.components.Actions.get(entityId)
      if (isComponentEqual({ ...current, value: actions }) || isFocused) {
        return
      }

      setComponentValue({ ...current, value: [...actions] })
    }
  }, [actions, isFocused, sdk])

  const hasAnimations = useMemo(() => {
    return animations.length > 0
  }, [animations])

  // actions that may only be available under certain circumstances
  const conditionalActions: Partial<Record<string, () => boolean>> = useMemo(
    () => ({
      [ActionType.PLAY_ANIMATION]: () => hasAnimations,
      [ActionType.STOP_ANIMATION]: () => hasAnimations,
      [ActionType.SET_STATE]: () => hasStates,
      [ActionType.INCREMENT_COUNTER]: () => hasCounter,
      [ActionType.DECREASE_COUNTER]: () => hasCounter,
      [ActionType.SET_COUNTER]: () => hasCounter
    }),
    [hasAnimations, hasStates]
  )

  const allActions = useMemo(() => {
    const actions = getActionTypes(sdk.engine as any)
    return actions
  }, [sdk])

  const availableActions = useMemo(() => {
    return allActions.filter((action) => {
      if (action in conditionalActions) {
        const isAvailable = conditionalActions[action]!
        return isAvailable()
      }
      return true
    })
  }, [conditionalActions, allActions])

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entityId, Actions)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entityId, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: ComponentName.ACTIONS,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
  }, [])

  const handleAddNewAction = useCallback(() => {
    addAction({ type: '', name: '', jsonPayload: '{}' })
  }, [addAction])

  const handleChangeAnimation = useCallback(
    (value: ActionPayload<ActionType.PLAY_ANIMATION>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.PLAY_ANIMATION>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeState = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.SET_STATE>({
          state: value
        })
      })
    },
    [modifyAction, actions]
  )

  const handleChangeTween = useCallback(
    (tween: ActionPayload<ActionType.START_TWEEN>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.START_TWEEN>(tween)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeSound = useCallback(
    (value: ActionPayload<ActionType.PLAY_SOUND>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.PLAY_SOUND>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeCounter = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.SET_COUNTER>({
          counter: parseInt(value)
        })
      })
    },
    [modifyAction, actions]
  )

  const handleChangeAmount = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.INCREMENT_COUNTER | ActionType.DECREASE_COUNTER>({
          amount: parseInt(value)
        })
      })
    },
    [modifyAction, actions]
  )

  const handleChangeAnchorPoint = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.ATTACH_TO_PLAYER>({
          anchorPointId: parseInt(value)
        })
      })
    },
    [modifyAction, actions]
  )

  const handleChangeTeleportPlayer = useCallback(
    (value: ActionPayload<ActionType.TELEPORT_PLAYER>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.TELEPORT_PLAYER>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeMovePlayer = useCallback(
    (value: ActionPayload<ActionType.MOVE_PLAYER>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.MOVE_PLAYER>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangePlayDefaultEmote = useCallback(
    (value: ActionPayload<ActionType.PLAY_DEFAULT_EMOTE>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.PLAY_DEFAULT_EMOTE>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangePlayCustomEmote = useCallback(
    (value: ActionPayload<ActionType.PLAY_CUSTOM_EMOTE>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.PLAY_CUSTOM_EMOTE>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeOpenLink = useCallback(
    (value: ActionPayload<ActionType.OPEN_LINK>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.OPEN_LINK>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeText = useCallback(
    (value: ActionPayload<ActionType.SHOW_TEXT>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.SHOW_TEXT>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeDelayAction = useCallback(
    (value: ActionPayload<ActionType.START_DELAY | ActionType.STOP_DELAY>, idx: number) => {
      const payload =
        'actions' in value ? getJson<ActionType.START_DELAY>(value) : getJson<ActionType.STOP_DELAY>(value)
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: payload
      })
    },
    [modifyAction, actions]
  )

  const handleChangeLoopAction = useCallback(
    (value: ActionPayload<ActionType.START_LOOP | ActionType.STOP_LOOP>, idx: number) => {
      const payload = 'actions' in value ? getJson<ActionType.START_LOOP>(value) : getJson<ActionType.STOP_LOOP>(value)
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: payload
      })
    },
    [modifyAction, actions]
  )

  const handleChangeCloneEntity = useCallback(
    (value: ActionPayload<ActionType.CLONE_ENTITY>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.CLONE_ENTITY>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeType = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        type: value,
        jsonPayload: getDefaultPayload(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeName = useCallback(
    (e: React.ChangeEvent<HTMLElement>, idx: number) => {
      const { value } = e.target as HTMLInputElement
      modifyAction(idx, {
        ...actions[idx],
        name: value
      })
    },
    [modifyAction, actions]
  )

  const handleChangeVisibility = useCallback(
    (value: ActionPayload<ActionType.SET_VISIBILITY>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.SET_VISIBILITY>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeImage = useCallback(
    (value: ActionPayload<ActionType.SHOW_IMAGE>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.SHOW_IMAGE>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeFollowPlayer = useCallback(
    (value: ActionPayload<ActionType.FOLLOW_PLAYER>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.FOLLOW_PLAYER>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeTriggerProximity = useCallback(
    (value: ActionPayload<ActionType.DAMAGE>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.DAMAGE>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleSetPosition = useCallback(
    (value: ActionPayload<ActionType.SET_POSITION>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.SET_POSITION>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleSetRotation = useCallback(
    (value: ActionPayload<ActionType.SET_ROTATION>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.SET_ROTATION>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleSetScale = useCallback(
    (value: ActionPayload<ActionType.SET_SCALE>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.SET_SCALE>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeActions = useCallback(
    (value: ActionPayload<ActionType.RANDOM | ActionType.BATCH>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.RANDOM | ActionType.BATCH>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleFocusInput = useCallback(
    ({ type }: React.FocusEvent<HTMLInputElement>) => {
      if (type === 'focus') {
        setIsFocused(true)
      } else {
        setIsFocused(false)
      }
    },
    [setIsFocused]
  )

  const handleChangeVideo = useCallback(
    (value: ActionPayload<ActionType.PLAY_VIDEO_STREAM>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.PLAY_VIDEO_STREAM>(value)
      })
    },
    [modifyAction, actions]
  )

  const handleChangeAudio = useCallback(
    (value: ActionPayload<ActionType.PLAY_AUDIO_STREAM>, idx: number) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<ActionType.PLAY_AUDIO_STREAM>(value)
      })
    },
    [modifyAction, actions]
  )

  const createHandler = <T extends ActionType>(getPayload: (value: string) => ActionPayload<T>, idx: number) => {
    const handler = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      modifyAction(idx, {
        ...actions[idx],
        jsonPayload: getJson<T>(getPayload(value))
      })
    }
    return handler
  }

  const handleRemoveAction = useCallback(
    (_e: React.MouseEvent, idx: number) => {
      removeAction(idx)
    },
    [removeAction]
  )

  if (!hasActions) {
    return null
  }

  const renderAction = (action: Action, idx: number) => {
    switch (action.type) {
      case ActionType.PLAY_ANIMATION: {
        return hasAnimations ? (
          <PlayAnimationAction
            value={getPartialPayload<ActionType.PLAY_ANIMATION>(action)}
            animations={animations}
            onUpdate={(value: ActionPayload<ActionType.PLAY_ANIMATION>) => handleChangeAnimation(value, idx)}
          />
        ) : null
      }
      case ActionType.SET_STATE: {
        return hasStates ? (
          <div className="row">
            <div className="field">
              <Dropdown
                label="Select State"
                placeholder="Select a State"
                options={[...states.map((state) => ({ label: state, value: state }))]}
                value={getPartialPayload<ActionType.SET_STATE>(action)?.state}
                onChange={(e) => handleChangeState(e, idx)}
              />
            </div>
          </div>
        ) : null
      }
      case ActionType.START_TWEEN: {
        return (
          <TweenAction
            tween={getPartialPayload<ActionType.START_TWEEN>(action)}
            onUpdateTween={(tween: ActionPayload<ActionType.START_TWEEN>) => handleChangeTween(tween, idx)}
          />
        )
      }
      case ActionType.SET_COUNTER: {
        return hasCounter ? (
          <div className="row">
            <div className="field">
              <TextField
                label="Counter Value"
                type="number"
                value={getPartialPayload<ActionType.SET_COUNTER>(action)?.counter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeCounter(e, idx)}
              />
            </div>
          </div>
        ) : null
      }
      case ActionType.INCREMENT_COUNTER: {
        return hasCounter ? (
          <div className="row">
            <div className="field">
              <TextField
                label="Amount"
                type="number"
                value={getPartialPayload<ActionType.INCREMENT_COUNTER>(action)?.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeAmount(e, idx)}
              />
            </div>
          </div>
        ) : null
      }
      case ActionType.DECREASE_COUNTER: {
        return hasCounter ? (
          <div className="row">
            <div className="field">
              <TextField
                label="Amount"
                type="number"
                value={getPartialPayload<ActionType.DECREASE_COUNTER>(action)?.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeAmount(e, idx)}
              />
            </div>
          </div>
        ) : null
      }
      case ActionType.PLAY_SOUND: {
        return (
          <PlaySoundAction
            value={getPartialPayload<ActionType.PLAY_SOUND>(action)}
            onUpdate={(value: ActionPayload<ActionType.PLAY_SOUND>) => handleChangeSound(value, idx)}
          />
        )
      }
      case ActionType.SET_VISIBILITY: {
        return (
          <SetVisibilityAction
            value={getPartialPayload<ActionType.SET_VISIBILITY>(action)}
            onUpdate={(e) => handleChangeVisibility(e, idx)}
          />
        )
      }
      case ActionType.ATTACH_TO_PLAYER: {
        return (
          <div className="row">
            <div className="field">
              <Dropdown
                label="Select an Anchor Point"
                placeholder="Select an Anchor Point"
                options={[
                  { value: AvatarAnchorPointType.AAPT_RIGHT_HAND, label: 'Right Hand' },
                  { value: AvatarAnchorPointType.AAPT_LEFT_HAND, label: 'Left Hand' },
                  { value: AvatarAnchorPointType.AAPT_NAME_TAG, label: 'Name Tag' },
                  { value: AvatarAnchorPointType.AAPT_POSITION, label: 'Avatar Position' }
                ]}
                value={getPartialPayload<ActionType.ATTACH_TO_PLAYER>(action)?.anchorPointId}
                onChange={(e) => handleChangeAnchorPoint(e, idx)}
              />
            </div>
          </div>
        )
      }
      case ActionType.TELEPORT_PLAYER: {
        return (
          <TeleportPlayerAction
            value={getPartialPayload<ActionType.TELEPORT_PLAYER>(action)}
            onUpdate={(e) => handleChangeTeleportPlayer(e, idx)}
          />
        )
      }
      case ActionType.MOVE_PLAYER: {
        return (
          <MovePlayerAction
            value={getPartialPayload<ActionType.MOVE_PLAYER>(action)}
            onUpdate={(e) => handleChangeMovePlayer(e, idx)}
          />
        )
      }
      case ActionType.PLAY_DEFAULT_EMOTE: {
        return (
          <PlayDefaultEmoteAction
            value={getPartialPayload<ActionType.PLAY_DEFAULT_EMOTE>(action)}
            onUpdate={(e) => handleChangePlayDefaultEmote(e, idx)}
          />
        )
      }
      case ActionType.PLAY_CUSTOM_EMOTE: {
        return (
          <PlayCustomEmoteAction
            value={getPartialPayload<ActionType.PLAY_CUSTOM_EMOTE>(action)}
            onUpdate={(e) => handleChangePlayCustomEmote(e, idx)}
          />
        )
      }
      case ActionType.OPEN_LINK: {
        return (
          <OpenLinkAction
            value={getPartialPayload<ActionType.OPEN_LINK>(action)}
            onUpdate={(e) => handleChangeOpenLink(e, idx)}
          />
        )
      }
      case ActionType.PLAY_VIDEO_STREAM: {
        return (
          <PlayVideoStreamAction
            value={getPartialPayload<ActionType.PLAY_VIDEO_STREAM>(action)}
            onUpdate={(value: ActionPayload<ActionType.PLAY_VIDEO_STREAM>) => handleChangeVideo(value, idx)}
          />
        )
      }
      case ActionType.PLAY_AUDIO_STREAM: {
        return (
          <PlayAudioStreamAction
            value={getPartialPayload<ActionType.PLAY_AUDIO_STREAM>(action)}
            onUpdate={(value: ActionPayload<ActionType.PLAY_AUDIO_STREAM>) => handleChangeAudio(value, idx)}
          />
        )
      }
      case ActionType.SHOW_TEXT: {
        return (
          <ShowTextAction
            value={getPartialPayload<ActionType.SHOW_TEXT>(action)}
            onUpdate={(e) => handleChangeText(e, idx)}
          />
        )
      }
      case ActionType.START_DELAY:
      case ActionType.STOP_DELAY: {
        return (
          <DelayAction<ActionPayload<typeof action.type>>
            availableActions={actions}
            value={getPayload<typeof action.type>(action)}
            onUpdate={(e) => handleChangeDelayAction(e, idx)}
          />
        )
      }
      case ActionType.START_LOOP:
      case ActionType.STOP_LOOP: {
        return (
          <LoopAction<ActionPayload<typeof action.type>>
            availableActions={actions}
            value={getPayload<typeof action.type>(action)}
            onUpdate={(e) => handleChangeLoopAction(e, idx)}
          />
        )
      }
      case ActionType.CLONE_ENTITY: {
        return (
          <CloneEntityAction
            value={getPartialPayload<ActionType.CLONE_ENTITY>(action)}
            onUpdate={(e) => handleChangeCloneEntity(e, idx)}
          />
        )
      }
      case ActionType.SHOW_IMAGE: {
        return (
          <ShowImageAction
            value={getPartialPayload<ActionType.SHOW_IMAGE>(action)}
            onUpdate={(e) => handleChangeImage(e, idx)}
          />
        )
      }
      case ActionType.FOLLOW_PLAYER:
        return (
          <FollowPlayerAction
            value={getPartialPayload<ActionType.FOLLOW_PLAYER>(action)}
            onUpdate={(e) => handleChangeFollowPlayer(e, idx)}
          />
        )
      case ActionType.DAMAGE:
        return (
          <TriggerProximityAction
            value={getPartialPayload<ActionType.DAMAGE>(action)}
            onUpdate={(e) => handleChangeTriggerProximity(e, idx)}
          />
        )
      case ActionType.SET_POSITION:
        return (
          <SetPositionAction
            value={getPartialPayload<ActionType.SET_POSITION>(action)}
            onUpdate={(e) => handleSetPosition(e, idx)}
          />
        )
      case ActionType.SET_ROTATION:
        return (
          <SetRotationAction
            value={getPartialPayload<ActionType.SET_ROTATION>(action)}
            onUpdate={(e) => handleSetRotation(e, idx)}
          />
        )
      case ActionType.SET_SCALE:
        return (
          <SetScaleAction
            value={getPartialPayload<ActionType.SET_SCALE>(action)}
            onUpdate={(e) => handleSetScale(e, idx)}
          />
        )
      case ActionType.RANDOM:
        return (
          <RandomAction
            value={getPartialPayload<ActionType.RANDOM>(action)}
            availableActions={actions}
            onUpdate={(e) => handleChangeActions(e, idx)}
          />
        )
      case ActionType.BATCH:
        return (
          <BatchAction
            value={getPartialPayload<ActionType.BATCH>(action)}
            availableActions={actions}
            onUpdate={(e) => handleChangeActions(e, idx)}
          />
        )
      case ActionType.HEAL_PLAYER: {
        return (
          <div className="row">
            <div className="field">
              <TextField
                label="Multiplier"
                type="number"
                value={getPartialPayload<ActionType.HEAL_PLAYER>(action)?.multiplier || 1}
                onChange={createHandler<ActionType.HEAL_PLAYER>((value) => ({ multiplier: parseInt(value) }), idx)}
              />
            </div>
          </div>
        )
      }
      default: {
        // TODO: handle generic schemas with something like <JsonSchemaField/>
        return null
      }
    }
  }

  return (
    <Container
      label="Action"
      className="ActionInspector"
      rightContent={
        <InfoTooltip
          text="Actions list the capabilities of entities, from playing animations to changing visibility. Customize or add new actions, which are activated by triggers."
          link="https://docs.decentraland.org/creator/smart-items/#actions"
          type="help"
        />
      }
      onRemoveContainer={handleRemove}
    >
      {actions.map((action: Action, idx: number) => {
        return (
          <Block key={`action-${idx}`}>
            <div className="row">
              <TextField
                type="text"
                label="Name"
                value={action.name}
                onChange={(e) => handleChangeName(e, idx)}
                onFocus={handleFocusInput}
                onBlur={handleFocusInput}
              />
              <Dropdown
                label="Select an Action"
                placeholder="Select an Action"
                disabled={availableActions.length === 0}
                options={[
                  ...availableActions.map((availableAction) => ({
                    label: ActionMapOption[availableAction],
                    value: availableAction
                  }))
                ]}
                value={action.type}
                onChange={(e) => handleChangeType(e, idx)}
              />
            </div>
            {renderAction(action, idx)}
            <MoreOptionsMenu>
              <Button className="RemoveButton" onClick={(e) => handleRemoveAction(e, idx)}>
                <RemoveIcon /> Remove Action
              </Button>
            </MoreOptionsMenu>
          </Block>
        )
      })}
      <AddButton onClick={handleAddNewAction}>Add New Action</AddButton>
    </Container>
  )
})
