import { useCallback, useEffect, useMemo, useState } from 'react'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon, AiOutlinePlus as AddIcon, AiOutlineMinus as RemoveIcon } from 'react-icons/ai'

import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { EditorComponentsTypes } from '../../../lib/sdk/components'

import { Block } from '../../Block'
import { Container } from '../../Container'
import { ContextMenu } from '../../ContexMenu'
import { Dropdown } from '../../Dropdown'
import { TextField } from '../TextField'

import { Action, Actions as AvailableActions, Props } from './types'

import './ActionInspector.css'

export default withSdk<Props>(
  withContextMenu<Props & WithSdkProps>(({ sdk, entity, contextMenuId }) => {
    const { Actions } = sdk.components
    const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<EditorComponentsTypes['Actions']>(
      entity,
      Actions
    )
    const { handleAction } = useContextMenu()
    const [actions, setActions] = useState<Action[]>(componentValue === null ? [] : componentValue.value)
    const [isFocused, setIsFocused] = useState(false)

    const hasActions = useHasComponent(entity, Actions)

    const areValidActions = useCallback(
      (updatedActions: Action[]) =>
        updatedActions.length > 0 &&
        !updatedActions.some((action) => !action.type || !action?.animation || !action.name),
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

    const entityAnimations = useMemo(() => {
      return sdk.sceneContext.getEntityOrNull(entity)?.gltfAssetContainer?.animationGroups || []
    }, [sdk.sceneContext.getEntityOrNull(entity)?.gltfAssetContainer])

    const availableActions: string[] = useMemo(() => {
      return Object.values(AvailableActions).filter(
        (action) =>
          isNaN(Number(action)) && (entityAnimations.length === 0 ? action !== AvailableActions.PLAY_ANIMATION : true)
      )
    }, [entityAnimations])

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, Actions)
      await sdk.operations.dispatch()
    }, [])

    const handleAddNewAction = useCallback(() => {
      setActions((prev: Action[]) => {
        return [...prev, { type: AvailableActions.PLAY_ANIMATION, name: '' }]
      })
    }, [setActions])

    const handleChangeAnimation = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        setActions((prev: Action[]) => {
          const data = [...prev]
          data[idx] = {
            ...data[idx],
            animation: value
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
            type: value as AvailableActions
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

    if (!hasActions) {
      return null
    }

    return (
      <Container label="Action" className="ActionInspector">
        <ContextMenu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </ContextMenu>

        {actions.map((action: Action, idx: number) => {
          return (
            <Block key={`action-${idx}`}>
              <Dropdown
                label={'Action'}
                disabled={availableActions.length === 0}
                options={availableActions}
                value={action.type}
                onChange={(e) => handleChangeType(e, idx)}
              />
              {action.type === AvailableActions.PLAY_ANIMATION && entityAnimations.length > 0 ? (
                <Dropdown
                  label={'Animations'}
                  options={[
                    { value: '', text: 'Select an Animation' },
                    ...entityAnimations.map((animation) => ({ text: animation.name, value: animation.name }))
                  ]}
                  value={action.animation}
                  onChange={(e) => handleChangeAnimation(e, idx)}
                />
              ) : null}
              <TextField
                label="Name"
                type="text"
                value={action.name}
                onChange={(e) => handleChangeName(e, idx)}
                onFocus={handleFocusInput}
                onBlur={handleFocusInput}
              />
              <button className="RemoveButton" onClick={(e) => handleRemoveAction(e, idx)}>
                <RemoveIcon />
              </button>
            </Block>
          )
        })}

        <button className="AddButton" onClick={handleAddNewAction}>
          <AddIcon />
        </button>
      </Container>
    )
  })
)
