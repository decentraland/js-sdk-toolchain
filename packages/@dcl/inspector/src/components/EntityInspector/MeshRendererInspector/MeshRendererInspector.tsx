import { useCallback } from 'react'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { Block } from '../../Block'
import { SelectField } from '../SelectField'
import { TextField } from '../../ui/TextField'
import { Container } from '../../Container'
import { Props, MeshType } from './types'
import { fromMeshRenderer, toMeshRenderer, isValidInput, SHAPES } from './utils'

export default withSdk<Props>(({ sdk, entity }) => {
  const { MeshRenderer } = sdk.components

  const hasMeshRenderer = useHasComponent(entity, MeshRenderer)
  const { getInputProps } = useComponentInput(entity, MeshRenderer, fromMeshRenderer, toMeshRenderer, isValidInput)

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, MeshRenderer)
    await sdk.operations.dispatch()
  }, [])

  if (!hasMeshRenderer) return null

  const mesh = getInputProps('mesh')

  return (
    <Container label="MeshRenderer" className="MeshRenderer" onRemoveContainer={handleRemove}>
      <Block>
        <SelectField label="Shape" options={SHAPES} {...mesh} />
      </Block>
      {mesh.value !== MeshType.MT_SPHERE && (
        <Block label="Additional fields">
          {/* {hasUvs(mesh.value) && <TextField label="Uvs" type="text" {...getInputProps('uvs')} />} */}
          {mesh.value === MeshType.MT_CYLINDER && (
            <>
              <TextField label="Radius top" type="number" {...getInputProps('radiusTop')} />
              <TextField label="Radius bottom" type="number" {...getInputProps('radiusBottom')} />
            </>
          )}
        </Block>
      )}
    </Container>
  )
})
