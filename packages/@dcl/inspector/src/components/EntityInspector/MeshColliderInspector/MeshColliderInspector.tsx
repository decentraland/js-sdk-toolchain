import { useCallback } from 'react'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField, Dropdown } from '../../ui'
import { SHAPES } from '../MeshRendererInspector/utils'
import { MeshType } from '../MeshRendererInspector/types'
import { COLLISION_LAYERS } from '../GltfInspector/utils'
import { fromMeshCollider, toMeshCollider, isValidInput } from './utils'
import { Props } from './types'

export default withSdk<Props>(({ sdk, entity }) => {
  const { MeshCollider } = sdk.components

  const hasMeshCollider = useHasComponent(entity, MeshCollider)
  const { getInputProps } = useComponentInput(entity, MeshCollider, fromMeshCollider, toMeshCollider, isValidInput)

  const handleRemove = useCallback(async () => {
    const { VisibilityComponent, GltfContainer } = sdk.components
    const hasGltfContainer = GltfContainer.has(entity)
    const hasVisibility = VisibilityComponent.has(entity)

    // Borrar MeshCollider
    sdk.operations.removeComponent(entity, MeshCollider)

    // Si se borra mesh: fijarse si hay GLTF, si NO hay borrar visibility
    if (hasVisibility && !hasGltfContainer) {
      sdk.operations.removeComponent(entity, VisibilityComponent)
    }

    await sdk.operations.dispatch()
  }, [sdk, entity])

  if (!hasMeshCollider) return null

  const mesh = getInputProps('mesh')

  return (
    <Container label="MeshCollider" className="MeshCollider" onRemoveContainer={handleRemove}>
      <Block>
        <Dropdown label="Shape" options={SHAPES} {...mesh} />
        <Dropdown label="Collision layer" options={COLLISION_LAYERS} {...getInputProps('collisionMask')} />
      </Block>
      {mesh.value === MeshType.MT_CYLINDER && (
        <Block label="Radius">
          <TextField autoSelect leftLabel="Top" type="number" {...getInputProps('radiusTop')} />
          <TextField autoSelect leftLabel="Bottom" type="number" {...getInputProps('radiusBottom')} />
        </Block>
      )}
    </Container>
  )
})
