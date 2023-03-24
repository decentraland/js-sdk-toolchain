import { TransformType } from '@dcl/ecs'
import { Quaternion } from '@dcl/ecs-math'

import { isValidNumericInput, useComponentInput } from '../../hooks/sdk/useComponentInput'
import { withSdk } from '../../hoc/withSdk'
import { Props, TransformProps } from './types'

import './EntityInspector.css'

export const EntityInspector: React.FC<Props> = ({ entity }) => {
  return (
    <div className="entity-inspector">
      <Transform entity={entity} />
    </div>
  )
}

type TransformInput = {
  position: {
    x: string
    y: string
    z: string
  }
  scale: {
    x: string
    y: string
    z: string
  }
  rotation: {
    x: string
    y: string
    z: string
  }
}

function fromTranform(value: TransformType): TransformInput {
  const angles = Quaternion.toEulerAngles(value.rotation)
  return {
    position: {
      x: value.position.x.toFixed(2),
      y: value.position.y.toFixed(2),
      z: value.position.z.toFixed(2)
    },
    scale: {
      x: value.scale.x.toFixed(2),
      y: value.scale.y.toFixed(2),
      z: value.scale.z.toFixed(2)
    },
    rotation: {
      x: formatAngle(angles.x),
      y: formatAngle(angles.y),
      z: formatAngle(angles.z)
    }
  }
}

function formatAngle(angle: number) {
  const value = angle.toFixed(2)
  return value === '360.00' ? '0.00' : value
}

function toTransform(inputs: TransformInput): TransformType {
  const rotation = Quaternion.fromEulerDegrees(
    Number(inputs.rotation.x),
    Number(inputs.rotation.y),
    Number(inputs.rotation.z)
  )
  return {
    position: {
      x: Number(inputs.position.x),
      y: Number(inputs.position.y),
      z: Number(inputs.position.z)
    },
    scale: {
      x: Number(inputs.scale.x),
      y: Number(inputs.scale.y),
      z: Number(inputs.scale.z)
    },
    rotation
  }
}

const Transform = withSdk<TransformProps>(({ sdk, entity }) => {
  const { Transform } = sdk.components

  const getProps = useComponentInput(entity, Transform, fromTranform, toTransform, isValidNumericInput)

  if (!Transform.has(entity)) return null

  return (
    <>
      <div className="block">
        <h4>Position:</h4>
        <span>
          x<input type="number" {...getProps('position.x')} />
        </span>
        <span>
          y<input type="number" {...getProps('position.y')} />
        </span>
        <span>
          z<input type="number" {...getProps('position.z')} />
        </span>
      </div>
      <div className="block">
        <h4>Scale:</h4>
        <span>
          x<input type="number" {...getProps('scale.x')} />
        </span>
        <span>
          y<input type="number" {...getProps('scale.y')} />
        </span>
        <span>
          z<input type="number" {...getProps('scale.z')} />
        </span>
      </div>
      <div className="block">
        <h4>Rotation:</h4>
        <span>
          x<input type="number" {...getProps('rotation.x')} />
        </span>
        <span>
          y<input type="number" {...getProps('rotation.y')} />
        </span>
        <span>
          z<input type="number" {...getProps('rotation.z')} />
        </span>
      </div>
    </>
  )
})
