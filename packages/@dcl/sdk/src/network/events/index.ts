/**
 * Event Bus for client-server communication in SDK7
 * 
 * Simple extensible event system for multiplayer scenes.
 * 
 * @example Basic usage:
 * ```typescript
 * import { registerEvents, getEventBus, isServer } from '@dcl/sdk/network/events'
 * 
 * const MyGameEvents = {
 *   playerJump: Schemas.Map({ playerId: Schemas.String, position: Schemas.Vector3 }),
 *   gameUpdate: Schemas.Map({ message: Schemas.String })
 * }
 * 
 * // Option 1: Register and get typed eventBus
 * const eventBus = registerEvents(MyGameEvents)
 * 
 * // Option 2: Register first, then get typed eventBus
 * // registerEvents(MyGameEvents)
 * // const eventBus = getEventBus<typeof MyGameEvents>()
 * 
 * export function main() {
 *   if (isServer()) {
 *     eventBus.onMessage('playerJump', (data, context) => {
 *       console.log(`Player ${context?.from} jumped`)
 *       eventBus.send('gameUpdate', { message: 'Player jumped!' })
 *     })
 *   } else {
 *     eventBus.send('playerJump', { playerId: 'me', position: { x: 1, y: 2, z: 3 } })
 *     eventBus.onMessage('gameUpdate', (data) => {
 *       console.log('Server says:', data.message)
 *     })
 *   }
 * }
 * ```
 * 
 * @packageDocumentation
 */

// Import public API and types
import { registerEvents, getEventBus, EventContext } from './implementation'
import { EventSchemaRegistry } from './registry'

// Re-export public API - only what users need
export { registerEvents, getEventBus }

// Re-export types that users need
export type { EventContext, EventSchemaRegistry }