import { engine } from '@dcl/sdk/ecs'
import * as components from '@dcl/ecs/dist/components'

export function main() {
  const Label = components.Label(engine)
  console.log({ label: engine.getEntityOrNullByLabel('Snow') })
  for (const [entity] of engine.getEntitiesWith(Label)) {
    console.log({ entity })
  }
}
