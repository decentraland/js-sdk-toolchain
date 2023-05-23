import { Composite, engine } from '@dcl/ecs'
import { compositeProvider } from '@dcl/sdk/composite-provider'

export function spawnSomeDoors() {
  const doorComposite = compositeProvider.getCompositeOrNull('~node_modules/door-and-house-library/door.composite')

  if (doorComposite) {
    const door1 = engine.addEntity()
    const door2 = engine.addEntity()

    Composite.instance(engine, doorComposite, compositeProvider, { rootEntity: door1 })
    Composite.instance(engine, doorComposite, compositeProvider, { rootEntity: door2 })
  }
}
