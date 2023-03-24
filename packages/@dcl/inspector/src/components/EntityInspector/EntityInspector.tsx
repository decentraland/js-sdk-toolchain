import { TransformType } from '@dcl/ecs'
import { Quaternion } from '@dcl/ecs-math'
import isEqual from 'deep-equal'

import { NestedKey, setValue } from '../../lib/logic/get-set-value'
import { useComponent } from '../../hooks/sdk/useComponent'
import { withSdk } from '../../hoc/withSdk'
import { Props, TransformProps } from './types'

import './EntityInspector.css'
import { useCallback, useEffect, useState } from 'react'

export const EntityInspector: React.FC<Props> = ({ entity }) => {
  return (
    <div className="entity-inspector">
      <Transform entity={entity} />
    </div>
  )
}

type TransformInputs = {
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

function fromTranform(value: TransformType): TransformInputs {
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

function isNumeric(value: string) {
  return !isNaN(Number(value))
}

function isValid(inputs: TransformInputs): boolean {
  return Object.values(inputs).every((value) => {
    if (typeof value === 'object') {
      return Object.values(value).every((value) => value.length > 0 && isNumeric(value))
    }
    return isNumeric(value)
  })
}

function toTransform(inputs: TransformInputs): TransformType {
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

  const [transform, setTransform] = useComponent<TransformType>(entity, Transform)
  const [inputs, setInputs] = useState<TransformInputs>(fromTranform(transform))
  const [isFocused, setIsFocused] = useState(false)

  const handleUpdate = (path: NestedKey<TransformInputs>) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const newInputs = setValue(inputs, path, event.target.value)
    setInputs(newInputs)
  }

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    setInputs(fromTranform(transform))
  }, [transform])

  // sync inputs -> engine
  useEffect(() => {
    if (isValid(inputs)) {
      const newTransform = toTransform(inputs)
      if (!isEqual(newTransform, transform)) {
        setTransform(newTransform)
      }
    }
  }, [inputs])

  // sync engine -> inputs
  useEffect(() => {
    if (isFocused) {
      // skip sync from state while editing, to avoid overriding the user input
      return
    }
    const newInputs = fromTranform(transform)
    if (!isEqual(newInputs, inputs)) {
      setInputs(newInputs)
    }
  }, [transform])

  if (!Transform.has(entity)) return null

  return (
    <>
      <div className="block">
        <h4>Position:</h4>
        <span>
          x
          <input
            type="number"
            onChange={handleUpdate('position.x')}
            value={inputs.position.x}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </span>
        <span>
          y
          <input
            type="number"
            onChange={handleUpdate('position.y')}
            value={inputs.position.y}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </span>
        <span>
          z
          <input
            type="number"
            onChange={handleUpdate('position.z')}
            value={inputs.position.z}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </span>
      </div>
      <div className="block">
        <h4>Scale:</h4>
        <span>
          x
          <input
            type="number"
            onChange={handleUpdate('scale.x')}
            value={inputs.scale.x}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </span>
        <span>
          y
          <input
            type="number"
            onChange={handleUpdate('scale.y')}
            value={inputs.scale.y}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </span>
        <span>
          z
          <input
            type="number"
            onChange={handleUpdate('scale.z')}
            value={inputs.scale.z}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </span>
      </div>
      <div className="block">
        <h4>Rotation:</h4>
        <span>
          x
          <input
            type="number"
            onChange={handleUpdate('rotation.x')}
            value={inputs.rotation.x}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </span>
        <span>
          y
          <input
            type="number"
            onChange={handleUpdate('rotation.y')}
            value={inputs.rotation.y}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </span>
        <span>
          z
          <input
            type="number"
            onChange={handleUpdate('rotation.z')}
            value={inputs.rotation.z}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </span>
      </div>
    </>
  )
})
