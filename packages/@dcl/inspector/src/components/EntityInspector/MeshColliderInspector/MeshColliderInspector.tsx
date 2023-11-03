import { useCallback } from 'react'

import { withContextMenu } from '../../../hoc/withContextMenu'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
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
  withContextMenu<WithSdkProps & Props>(({ sdk, entity }) => {
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
      <Container label="MeshCollider" className="MeshCollider" onRemoveContainer={handleRemove}>
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
