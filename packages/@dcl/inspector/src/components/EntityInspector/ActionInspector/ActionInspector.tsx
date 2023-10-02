import { useCallback, useEffect, useMemo, useState } from 'react'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import { VscQuestion as QuestionIcon, VscTrash as RemoveIcon, VscInfo as InfoIcon } from 'react-icons/vsc'
import {
  Action,
  ActionType,
  getActionTypes,
  getPayload,
  getJson,
  ActionPayload,
  getActionSchema
} from '@dcl/asset-packs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { Popup } from 'decentraland-ui/dist/components/Popup/Popup'

import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useChange } from '../../../hooks/sdk/useChange'
import { EditorComponentsTypes } from '../../../lib/sdk/components'

import { Block } from '../../Block'
import { Container } from '../../Container'
import { ContextMenu } from '../../ContexMenu'
import { Dropdown } from '../../Dropdown'
import { TextField } from '../TextField'
import MoreOptionsMenu from '../MoreOptionsMenu'
import { AddButton } from '../AddButton'
import { Button } from '../../Button'

import { TweenAction } from './TweenAction'
import { Props } from './types'

import './ActionInspector.css'

function isStates(maybeStates: any): maybeStates is EditorComponentsTypes['States'] {
  return !!maybeStates && 'value' in maybeStates && Array.isArray(maybeStates.value)
}

function getPartialPayload<T extends ActionType>(action: Action) {
  return getPayload<T>(action) as Partial<ActionPayload<T>>
}

function isValidTween(tween: ActionPayload['start_tween']) {
  return !!tween.type && !!tween.end && !!tween.relative && !!tween.interpolationType && !!tween.duration
}

export default withSdk<Props>(
  withContextMenu<Props & WithSdkProps>(({ sdk, entity: entityId, contextMenuId }) => {
    const { Actions, States } = sdk.components
    const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<EditorComponentsTypes['Actions']>(
      entityId,
      Actions
    )

    const entity = sdk.sceneContext.getEntityOrNull(entityId)
    const { handleAction } = useContextMenu()
    const [actions, setActions] = useState<Action[]>(componentValue === null ? [] : componentValue.value)
    const [isFocused, setIsFocused] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [states, setStates] = useState<string[]>(States.getOrNull(entityId)?.value || [])

    const hasActions = useHasComponent(entityId, Actions)
    const hasStates = useHasComponent(entityId, States)

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
        if (isComponentEqual({ value: actions }) || isFocused) {
          return
        }

        setComponentValue({ value: [...actions] })
      }
    }, [actions, isFocused])

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

    const hasTweens = useMemo(() => {
      return actions.some((action) => action.type === ActionType.START_TWEEN)
    }, [actions])

    // actions that may only be available under certain circumstances
    const conditionalActions: Partial<Record<string, () => boolean>> = useMemo(
      () => ({
        [ActionType.PLAY_ANIMATION]: () => hasAnimations,
        [ActionType.SET_STATE]: () => hasStates,
        [ActionType.START_TWEEN]: () => hasTweens
      }),
      [hasAnimations, hasStates, hasTweens]
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
      setActions((prev: Action[]) => {
        return [...prev, { type: '', name: '', jsonPayload: '{}' }]
      })
    }, [setActions])

    const handleChangeAnimation = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        setActions((prev: Action[]) => {
          const data = [...prev]
          data[idx] = {
            ...data[idx],
            jsonPayload: getJson<ActionType.PLAY_ANIMATION>({
              animation: value
            })
          }
          return data
        })
      },
      [setActions]
    )

    const handleChangeState = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        setActions((prev: Action[]) => {
          const data = [...prev]
          data[idx] = {
            ...data[idx],
            jsonPayload: getJson<ActionType.SET_STATE>({
              state: value
            })
          }
          return data
        })
      },
      [setActions]
    )

    const handleChangeTween = useCallback(
      (tween: ActionPayload['start_tween'], idx: number) => {
        setActions((prev: Action[]) => {
          const data = [...prev]
          data[idx] = {
            ...data[idx],
            jsonPayload: getJson<ActionType.START_TWEEN>(tween)
          }
          return data
        })
      },
      [setActions]
    )

    const handleChangeType = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        setActions((prev: Action[]) => {
          const data = [...prev]
          data[idx] = {
            ...data[idx],
            type: value
          }
          return data
        })
      },
      [setActions]
    )

    const handleChangeName = useCallback(
      (e: React.ChangeEvent<HTMLElement>, idx: number) => {
        const { value } = e.target as HTMLInputElement
        setActions((prev: Action[]) => {
          const data = [...prev]
          data[idx] = {
            ...data[idx],
            name: value
          }
          return data
        })
      },
      [setActions]
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
        setActions((prev: Action[]) => {
          const data = [...prev]
          data.splice(idx, 1)
          return data
        })
      },
      [setActions]
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

    const renderSelectAnimationMoreInfo = () => {
      return (
        <Popup
          content={
            <>
              Learn more about animations in the <a href="">docs</a>.
            </>
          }
          trigger={<InfoIcon size={16} />}
          position="top center"
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
            <div className="row">
              <div className="field">
                <label>Select Animation {renderSelectAnimationMoreInfo()}</label>
                <Dropdown
                  options={[
                    { value: '', text: 'Select an Animation' },
                    ...animations.map((animation) => ({ text: animation.name, value: animation.name }))
                  ]}
                  value={getPartialPayload<ActionType.PLAY_ANIMATION>(action)?.animation}
                  onChange={(e) => handleChangeAnimation(e, idx)}
                />
              </div>
            </div>
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
          return hasTweens ? (
            <TweenAction
              tween={getPartialPayload<ActionType.START_TWEEN>(action)}
              onUpdateTween={(tween: ActionPayload['start_tween']) => handleChangeTween(tween, idx)}
            />
          ) : null
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
                  options={availableActions}
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
