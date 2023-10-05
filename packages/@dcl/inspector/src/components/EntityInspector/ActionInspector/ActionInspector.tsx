import { useCallback, useEffect, useMemo, useState } from 'react'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import { VscQuestion as QuestionIcon, VscTrash as RemoveIcon } from 'react-icons/vsc'
import { Action, ActionType, getActionTypes, getJson, ActionPayload, getActionSchema } from '@dcl/asset-packs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { Popup } from 'decentraland-ui/dist/components/Popup/Popup'

import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useChange } from '../../../hooks/sdk/useChange'
import { useArrayState } from '../../../hooks/useArrayState'
import { EditorComponentsTypes } from '../../../lib/sdk/components'

import { Block } from '../../Block'
import { Container } from '../../Container'
import { ContextMenu } from '../../ContexMenu'
import { Dropdown } from '../../Dropdown'
import { TextField } from '../TextField'
import MoreOptionsMenu from '../MoreOptionsMenu'
import { AddButton } from '../AddButton'
import { Button } from '../../Button'

import { PlaySoundAction } from './PlaySoundAction'
import { TweenAction } from './TweenAction'
import { isValidTween } from './TweenAction/utils'
import { getDefaultPayload, getPartialPayload, isStates } from './utils'
import { Props } from './types'

import './ActionInspector.css'
import { AvatarAnchorPointType } from '@dcl/ecs'
import { PlayAnimationAction } from './PlayAnimationAction'

export default withSdk<Props>(
  withContextMenu<Props & WithSdkProps>(({ sdk, entity: entityId, contextMenuId }) => {
    const { Actions, States, Counter } = sdk.components
    const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<EditorComponentsTypes['Actions']>(
      entityId,
      Actions
    )

    const entity = sdk.sceneContext.getEntityOrNull(entityId)
    const { handleAction } = useContextMenu()
    const [actions, addAction, modifyAction, removeAction] = useArrayState<Action>(
      componentValue === null ? [] : componentValue.value
    )
    const [isFocused, setIsFocused] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
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
          case ActionType.SET_VISIBILITY: {
            const payload = getPartialPayload<ActionType.SET_VISIBILITY>(action)
            return !!payload
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

    useEffect(() => {
      if (entity?.isGltfPathLoading()) {
        entity
          ?.getGltfPathLoading()
          ?.then((_value) => {
            setIsLoaded(true)
          })
          .catch((_e) => {
            setIsLoaded(false)
          })
      } else {
        setIsLoaded(true)
      }
    }, [])

    const animations = useMemo(() => {
      return entity?.gltfAssetContainer?.animationGroups || []
    }, [entity?.gltfAssetContainer?.animationGroups])

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

    const handleSetVisible = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        modifyAction(idx, {
          ...actions[idx],
          jsonPayload: getJson<ActionType.SET_VISIBILITY>({
            visible: value === 'true'
          })
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

    const handleRemoveAction = useCallback(
      (e: React.MouseEvent, idx: number) => {
        e.stopPropagation()
        removeAction(idx)
      },
      [removeAction]
    )

    if (!hasActions || !isLoaded) {
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
                <label>Select State</label>
                <Dropdown
                  options={[
                    { value: '', text: 'Select a State' },
                    ...states.map((state) => ({ text: state, value: state }))
                  ]}
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
                <label>Counter Value</label>
                <TextField
                  type="numeric"
                  value={getPartialPayload<ActionType.SET_COUNTER>(action)?.counter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeCounter(e, idx)}
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
            <div className="row">
              <div className="field">
                <label>Select Visibility</label>
                <Dropdown
                  options={[
                    { value: 'true', text: 'Visible' },
                    { value: 'false', text: 'Invisible' }
                  ]}
                  value={(getPartialPayload<ActionType.SET_VISIBILITY>(action)?.visible ?? true).toString()}
                  onChange={(e) => handleSetVisible(e, idx)}
                />
              </div>
            </div>
          )
        }
        case ActionType.ATTACH_TO_PLAYER: {
          return (
            <div className="row">
              <div className="field">
                <label>Select Anchor Point</label>
                <Dropdown
                  options={[
                    { value: '', text: 'Select an Anchor Point' },
                    { value: AvatarAnchorPointType.AAPT_RIGHT_HAND, text: 'Right Hand' },
                    { value: AvatarAnchorPointType.AAPT_LEFT_HAND, text: 'Left Hand' },
                    { value: AvatarAnchorPointType.AAPT_NAME_TAG, text: 'Name Tag' },
                    { value: AvatarAnchorPointType.AAPT_POSITION, text: 'Avatar Position' }
                  ]}
                  value={getPartialPayload<ActionType.ATTACH_TO_PLAYER>(action)?.anchorPointId}
                  onChange={(e) => handleChangeAnchorPoint(e, idx)}
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
      <Container label="Action" className="ActionInspector" rightContent={renderMoreInfo()}>
        <ContextMenu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </ContextMenu>

        {actions.map((action: Action, idx: number) => {
          return (
            <Block key={`action-${idx}`}>
              <div className="row">
                <div className="field">
                  <label>Name</label>
                  <TextField
                    type="text"
                    value={action.name}
                    onChange={(e) => handleChangeName(e, idx)}
                    onFocus={handleFocusInput}
                    onBlur={handleFocusInput}
                  />
                </div>
                <Dropdown
                  label={'Select Action'}
                  disabled={availableActions.length === 0}
                  options={[
                    { text: 'Select an Action', value: '' },
                    ...availableActions.map((availableAction) => ({ text: availableAction, value: availableAction }))
                  ]}
                  value={action.type}
                  onChange={(e) => handleChangeType(e, idx)}
                />
                <MoreOptionsMenu>
                  <Button className="RemoveButton" onClick={(e) => handleRemoveAction(e, idx)}>
                    <RemoveIcon /> Remove Action
                  </Button>
                </MoreOptionsMenu>
              </div>
              {renderAction(action, idx)}
            </Block>
          )
        })}
        <AddButton onClick={handleAddNewAction}>Add New Action</AddButton>
      </Container>
    )
  })
)
