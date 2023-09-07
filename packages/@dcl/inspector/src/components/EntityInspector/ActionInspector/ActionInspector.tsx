import { useCallback, useEffect, useMemo, useState } from 'react'
import { Action, ActionType } from '@dcl/asset-packs'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon, AiOutlinePlus as AddIcon } from 'react-icons/ai'
import { VscQuestion as QuestionIcon, VscTrash as RemoveIcon, VscInfo as InfoIcon } from 'react-icons/vsc'
import { Popup } from 'decentraland-ui/dist/components/Popup/Popup'

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

import { Props } from './types'

import './ActionInspector.css'
import MoreOptionsMenu from '../MoreOptionsMenu'
import Button from '../../Button'

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
      return Object.values(ActionType).filter(
        (action) =>
          isNaN(Number(action)) && (entityAnimations.length === 0 ? action !== ActionType.PLAY_ANIMATION : true)
      )
    }, [entityAnimations])

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, Actions)
      await sdk.operations.dispatch()
    }, [])

    const handleAddNewAction = useCallback(() => {
      setActions((prev: Action[]) => {
        return [...prev, { type: ActionType.PLAY_ANIMATION, name: '' }]
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
            type: value as ActionType
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
              {action.type === ActionType.PLAY_ANIMATION && entityAnimations.length > 0 ? (
                <div className="row">
                  <div className="field">
                    <label>Select Animation {renderSelectAnimationMoreInfo()}</label>
                    <Dropdown
                      options={[
                        { value: '', text: 'Select an Animation' },
                        ...entityAnimations.map((animation) => ({ text: animation.name, value: animation.name }))
                      ]}
                      value={action.animation}
                      onChange={(e) => handleChangeAnimation(e, idx)}
                    />
                  </div>
                </div>
              ) : null}
            </Block>
          )
        })}

        <button className="AddButton" onClick={handleAddNewAction}>
          <AddIcon /> Add New Action
        </button>
      </Container>
    )
  })
)
