/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine, IEngine } from '../../engine'
import { Task, createTaskSystem } from '../../systems/async-task'
import { createPointerEventSystem, PointerEventsSystem } from '../../systems/events'
import { createInputSystem, IInputSystem } from './../../engine/input'

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
/* @__PURE__ */
export const engine: IEngine = Engine()

/**
 * @public
 * Input system manager. Check for button events
 * @example
 * inputSystem.isTriggered: Returns true if an input action ocurred since the last tick.
 * inputSystem.isPressed: Returns true if an input is currently being pressed down. It will return true on every tick until the button goes up again.
 * inputSystem.getInputCommand: Returns an object with data about the input action.
 */
/* @__PURE__ */
export const inputSystem: IInputSystem = createInputSystem(engine)
export { IInputSystem }

/**
 * @public
 * Register callback functions to a particular entity.
 */
/* @__PURE__ */
export const pointerEventsSystem: PointerEventsSystem = createPointerEventSystem(engine, inputSystem)
export { PointerEventsSystem }

/**
 * @public
 * Runs an async function
 */
/* @__PURE__ */
export const executeTask = createTaskSystem(engine).executeTask

/**
 * @public
 */
export type { Task }
