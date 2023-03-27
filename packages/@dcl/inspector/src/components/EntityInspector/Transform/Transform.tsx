import { isValidNumericInput, useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { withSdk } from '../../../hoc/withSdk'
import { Props } from './types'
import { fromTranform, toTransform } from './utils'
import './Transform.css'

export const Transform = withSdk<Props>(({ sdk, entity }) => {
  const { Transform } = sdk.components
  const hasTransform = useHasComponent(entity, Transform)
  const getProps = useComponentInput(entity, Transform, fromTranform, toTransform, isValidNumericInput)

  if (!hasTransform) {
    return null
  }

  return (
    <div className="Transform">
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
    </div>
  )
})
