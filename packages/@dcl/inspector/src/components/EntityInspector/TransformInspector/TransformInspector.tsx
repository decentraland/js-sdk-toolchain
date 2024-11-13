import { useEffect } from 'react'

import { isValidNumericInput, useComponentInput, useComponentInput2 } from '../../../hooks/sdk/useComponentInput'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { withSdk } from '../../../hoc/withSdk'

import { Props } from './types'
import { fromTransform, toTransform, fromTransformConfig } from './utils'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField } from '../../ui'
import { Link, Props as LinkProps } from './Link'

import './TransformInspector.css'

export default withSdk<Props>(({ sdk, entities }) => {
  const { Transform, TransformConfig } = sdk.components
  const entity = entities.find((entity) => Transform.has(entity)) || entities[0]

  const hasTransform = useHasComponent(entity, Transform)
  const transform = Transform.getOrNull(entity) ?? undefined
  const config = TransformConfig.getOrNull(entity) ?? undefined
  const { getInputProps } = useComponentInput2(
    entities,
    Transform,
    fromTransform,
    toTransform(transform, config),
    isValidNumericInput
  )
  const { getInputProps: getConfigProps } = useComponentInput(
    entity,
    TransformConfig,
    fromTransformConfig,
    fromTransformConfig
  )

  useEffect(() => {
    if (!hasTransform) return
    if (!config) {
      sdk.operations.addComponent(entity, TransformConfig.componentId)
      void sdk.operations.dispatch()
    }
  }, [hasTransform])

  const _getConfigProps = getConfigProps as LinkProps['getInputProps']

  if (!hasTransform) return null

  return (
    <Container label="Transform" className="Transform">
      <Block label="Position">
        <TextField leftLabel="X" type="number" {...getInputProps('position.x')} autoSelect />
        <TextField leftLabel="Y" type="number" {...getInputProps('position.y')} autoSelect />
        <TextField leftLabel="Z" type="number" {...getInputProps('position.z')} autoSelect />
      </Block>
      <Block label="Rotation">
        <TextField leftLabel="X" type="number" {...getInputProps('rotation.x')} autoSelect />
        <TextField leftLabel="Y" type="number" {...getInputProps('rotation.y')} autoSelect />
        <TextField leftLabel="Z" type="number" {...getInputProps('rotation.z')} autoSelect />
      </Block>
      <Block label="Scale">
        <TextField leftLabel="X" type="number" {...getInputProps('scale.x')} autoSelect />
        <TextField leftLabel="Y" type="number" {...getInputProps('scale.y')} autoSelect />
        <TextField leftLabel="Z" type="number" {...getInputProps('scale.z')} autoSelect />
        <Link field="porportionalScaling" getInputProps={_getConfigProps} />
      </Block>
    </Container>
  )
})
