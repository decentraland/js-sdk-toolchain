import { useCallback, useMemo } from 'react'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField, Dropdown } from '../../ui'
import { fromMeshRenderer, toMeshRenderer, isValidInput, SHAPES } from './utils'

import { Props, MeshType } from './types'

export default withSdk<Props>(({ sdk, entity }) => {
  const { MeshRenderer } = sdk.components

  const hasMeshRenderer = useHasComponent(entity, MeshRenderer)
  const { getInputProps } = useComponentInput(entity, MeshRenderer, fromMeshRenderer, toMeshRenderer, isValidInput)

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, MeshRenderer)
    await sdk.operations.dispatch()
  }, [])

  const mesh = useMemo(() => getInputProps('mesh'), [getInputProps])

  const renderComponent = useCallback(() => {
    switch (mesh.value) {
      case MeshType.MT_CYLINDER: {
        return (
          <Block label="Radius">
            <TextField leftLabel="Top" type="number" {...getInputProps('radiusTop')} />
            <TextField leftLabel="Bottom" type="number" {...getInputProps('radiusBottom')} />
          </Block>
        )
      }
      case MeshType.MT_SPHERE:
      default: {
        {
          /* {hasUvs(mesh.value) && <TextField label="Uvs" type="text" {...getInputProps('uvs')} />} */
        }
        return null
      }
    }
  }, [mesh, getInputProps])

  if (!hasMeshRenderer) return null

  return (
    <Container label="MeshRenderer" className="MeshRenderer" onRemoveContainer={handleRemove}>
      <Block>
        <Dropdown label="Shape" options={SHAPES} {...mesh} />
      </Block>
      {renderComponent()}
    </Container>
  )
})
