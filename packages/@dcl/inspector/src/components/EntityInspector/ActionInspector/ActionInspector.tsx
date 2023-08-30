import { useCallback, useEffect, useMemo } from 'react'
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
    const [componentValue, setComponentValue] = useComponentValue<EditorComponentsTypes['Actions']>(entity, Actions)
    const { handleAction } = useContextMenu()
    const hasActions = useHasComponent(entity, Actions)

    useEffect(() => {
      if (hasActions && componentValue.value.length === 0) {
        handleAddNewAction()
      }
    }, [hasActions])

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
      setComponentValue((prev: EditorComponentsTypes['Actions']) => {
        return { value: [...prev.value, { type: AvailableActions.PLAY_ANIMATION, name: '' }] }
      })
    }, [])

    const handleChangeAnimation = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        const { value } = e.target
        setComponentValue((prev: EditorComponentsTypes['Actions']) => {
          const data = [...prev.value]
          data[idx].animation = value
          return { value: data }
        })
      },
      [setComponentValue]
    )

    const handleChangeType = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        setComponentValue((prev: EditorComponentsTypes['Actions']) => {
          const data = [...prev.value]
          data[idx].type = value as AvailableActions
          return { value: data }
        })
      },
      [setComponentValue]
    )

    const handleChangeName = useCallback(
      (e: React.ChangeEvent<HTMLElement>, idx: number) => {
        const { value } = e.target as HTMLInputElement
        setComponentValue((prev: EditorComponentsTypes['Actions']) => {
          const data = [...prev.value]
          data[idx].name = value
          return { value: data }
        })
      },
      [setComponentValue]
    )

    const handleRemoveAction = useCallback(
      (e: React.MouseEvent, idx: number) => {
        e.stopPropagation()
        setComponentValue((prev: EditorComponentsTypes['Actions']) => {
          const data = [...prev.value]
          data.splice(idx, 1)
          return { value: data }
        })
      },
      [setComponentValue]
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

        {componentValue.value.map((action: Action, idx: number) => {
          return (
            <Block key={`action-${idx}`}>
              <Dropdown
                label={'Action'}
                options={availableActions}
                value={action.type}
                onChange={(e) => handleChangeType(e, idx)}
              />
              {action.type === AvailableActions.PLAY_ANIMATION && entityAnimations.length > 0 ? (
                <Dropdown
                  label={'Animations'}
                  options={entityAnimations.map((animation) => animation.name)}
                  value={action.animation}
                  onChange={(e) => handleChangeAnimation(e, idx)}
                />
              ) : null}
              <TextField label="Name" type="text" value={action.name} onChange={(e) => handleChangeName(e, idx)} />
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
