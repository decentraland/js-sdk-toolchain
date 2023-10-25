import { useCallback } from 'react'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'

import { ContextMenu as Menu } from '../../ContexMenu'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { Block } from '../../Block'
import { SelectField } from '../SelectField'
import { TextField } from '../../ui/TextField'
import { Container } from '../../Container'
import { Props } from './types'
import { fromMeshCollider, toMeshCollider, isValidInput } from './utils'
import { SHAPES } from '../MeshRendererInspector/utils'
import { MeshType } from '../MeshRendererInspector/types'
import { COLLISION_LAYERS } from '../GltfInspector/utils'

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const { handleAction } = useContextMenu()
    const { MeshCollider } = sdk.components

    const hasMeshCollider = useHasComponent(entity, MeshCollider)
    const { getInputProps } = useComponentInput(entity, MeshCollider, fromMeshCollider, toMeshCollider, isValidInput)

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, MeshCollider)
      await sdk.operations.dispatch()
    }, [])

    if (!hasMeshCollider) return null

    const mesh = getInputProps('mesh')

    return (
      <Container label="MeshCollider" className="MeshCollider">
        <Menu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </Menu>
        <Block>
          <SelectField label="Shape" options={SHAPES} {...mesh} />
          <SelectField label="Collision layer" options={COLLISION_LAYERS} {...getInputProps('collisionMask')} />
        </Block>
        {mesh.value === MeshType.MT_CYLINDER && (
          <Block label="Additional fields">
            <TextField label="Radius top" type="number" {...getInputProps('radiusTop')} />
            <TextField label="Radius bottom" type="number" {...getInputProps('radiusBottom')} />
          </Block>
        )}
      </Container>
    )
  })
)
