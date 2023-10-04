import { useCallback } from 'react'
import { Item } from 'react-contexify'
import { useDrop } from 'react-dnd'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'

import { ContextMenu as Menu } from '../../ContexMenu'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { ProjectAssetDrop, getNode } from '../../../lib/sdk/drag-drop'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { SelectField } from '../SelectField'
import { TextField } from '../TextField'
import { Props } from './types'
import { fromGltf, toGltf, isValidInput, COLLISION_LAYERS, isModel } from './utils'
import { withAssetDir } from '../../../lib/data-layer/host/fs-utils'
import { useAppSelector } from '../../../redux/hooks'
import { selectAssetCatalog } from '../../../redux/app'

const DROP_TYPES = ['project-asset']

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const files = useAppSelector(selectAssetCatalog)
    const { handleAction } = useContextMenu()
    const { GltfContainer } = sdk.components

    const hasGltf = useHasComponent(entity, GltfContainer)
    const handleInputValidation = useCallback(
      ({ src }: { src: string }) => !!files && isValidInput(files, src),
      [files]
    )
    const { getInputProps, isValid } = useComponentInput(
      entity,
      GltfContainer,
      fromGltf(files?.basePath ?? ''),
      toGltf(files?.basePath ?? ''),
      handleInputValidation,
      [files]
    )

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, GltfContainer)
      await sdk.operations.dispatch()
    }, [])
    const handleDrop = useCallback(async (src: string) => {
      const { operations } = sdk
      operations.updateValue(GltfContainer, entity, { src })
      await operations.dispatch()
    }, [])

    const [{ isHover }, drop] = useDrop(
      () => ({
        accept: DROP_TYPES,
        drop: ({ value, context }: ProjectAssetDrop, monitor) => {
          if (monitor.didDrop()) return
          const node = context.tree.get(value)!
          const model = getNode(node, context.tree, isModel)
          if (model) void handleDrop(withAssetDir(model.asset.src))
        },
        canDrop: ({ value, context }: ProjectAssetDrop) => {
          const node = context.tree.get(value)!
          return !!getNode(node, context.tree, isModel)
        },
        collect: (monitor) => ({
          isHover: monitor.canDrop() && monitor.isOver()
        })
      }),
      [files]
    )

    if (!hasGltf) return null

    return (
      <Container label="GLTF" className="GltfInspector">
        <Menu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </Menu>
        <Block label="Path" ref={drop}>
          <TextField type="text" {...getInputProps('src')} drop={isHover} error={files && !isValid} />
        </Block>
        <Block label="Collision">
          <SelectField
            label="Visible layer"
            options={COLLISION_LAYERS}
            {...getInputProps('visibleMeshesCollisionMask')}
          />
          <SelectField
            label="Invisible layer"
            options={COLLISION_LAYERS}
            {...getInputProps('invisibleMeshesCollisionMask')}
          />
        </Block>
      </Container>
    )
  })
)
