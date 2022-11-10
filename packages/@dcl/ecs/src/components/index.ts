import { IEngine } from '../engine'
import { defineLibraryComponents } from './generated/index.gen'
import { defineTransformComponent } from './legacy/Transform'
import { defineAnimatorComponent } from './extended/Animator'

export function defineSdkComponents(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
) {
  const autogeneratedComponents = defineLibraryComponents(engine)
  return {
    ...autogeneratedComponents,
    Animator: defineAnimatorComponent(engine),
    Transform: defineTransformComponent(engine)
  }
}
