/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine, IEngine } from '../../engine'
import { Task, createTaskSystem } from '../../systems/async-task'
import { createPointerEventsSystem, PointerEventsSystem } from '../../systems/events'
import { createInputSystem, IInputSystem } from './../../engine/input'
import { createRaycastSystem, RaycastSystem } from '../../systems/raycast'
import { createVideoEventsSystem, VideoEventsSystem } from '../../systems/videoEvents'
import { TweenSystem, createTweenSystem } from '../../systems/tween'

/**
 * @public
 * The engine is the part of the scene that sits in the middle and manages all of the other parts.
 * It determines what entities are rendered and how players interact with them.
 * It also coordinates what functions from systems are executed and when.
 *
 * @example
 * import { engine } from '@dcl/sdk/ecs'
 * const entity = engine.addEntity()
 * engine.addSystem(someSystemFunction)
 *
 */
export const engine: IEngine = /* @__PURE__ */ Engine()

/**
 * @public
 * Input system manager. Check for button events
 * @example
 * inputSystem.isTriggered: Returns true if an input action ocurred since the last tick.
 * inputSystem.isPressed: Returns true if an input is currently being pressed down. It will return true on every tick until the button goes up again.
 * inputSystem.getInputCommand: Returns an object with data about the input action.
 */
export const inputSystem: IInputSystem = /* @__PURE__ */ createInputSystem(engine)
export { IInputSystem }

/**
 * @public
 * Register callback functions to a particular entity on input events.
 */
export const pointerEventsSystem: PointerEventsSystem = /* @__PURE__ */ createPointerEventsSystem(engine, inputSystem)
export { PointerEventsSystem }

/**
 * @public
 * Register callback functions to a particular entity on raycast results.
 */
export const raycastSystem: RaycastSystem = /* @__PURE__ */ createRaycastSystem(engine)
export { RaycastSystem }

/**
 * @public
 * Register callback functions to a particular entity on video events.
 */
export const videoEventsSystem: VideoEventsSystem = /* @__PURE__ */ createVideoEventsSystem(engine)
export { VideoEventsSystem }

/**
 * @public
 * Register callback functions to a particular entity on video events.
 */
export const tweenSystem: TweenSystem = createTweenSystem(engine)
export { TweenSystem }

/**
 * @public
 * Runs an async function
 */
export const executeTask = /* @__PURE__ */ createTaskSystem(engine)

/**
 * @public
 */
export type { Task }
