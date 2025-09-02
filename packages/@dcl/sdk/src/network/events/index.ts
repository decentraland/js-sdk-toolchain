/**
 * Room - Multiplayer messaging for SDK7
 * 
 * Simple room-based communication system for multiplayer scenes.
 * 
 * @example Basic usage:
 * ```typescript
 * import { registerMessages, getRoom, isServer } from '@dcl/sdk/network/events'
 * 
 * const MyMessages = {
 *   playerJump: Schemas.Map({ playerId: Schemas.String, position: Schemas.Vector3 }),
 *   gameUpdate: Schemas.Map({ message: Schemas.String })
 * }
 * 
 * // Option 1: Register and get typed room
 * const room = registerMessages(MyMessages)
 * 
 * // Option 2: Register first, then get typed room
 * // registerMessages(MyMessages)
 * // const room = getRoom<typeof MyMessages>()
 * 
 * export function main() {
 *   if (isServer()) {
 *     room.onMessage('playerJump', (data, context) => {
 *       console.log(`Player ${context?.from} jumped`)
 *       room.send('gameUpdate', { message: 'Player jumped!' })
 *     })
 *   } else {
 *     room.send('playerJump', { playerId: 'me', position: { x: 1, y: 2, z: 3 } })
 *     room.onMessage('gameUpdate', (data) => {
 *       console.log('Server says:', data.message)
 *     })
 *   }
 * }
 * ```
 * 
 * @packageDocumentation
 */

// Import public API and types
import { registerMessages, getRoom, EventContext } from './implementation'
import { EventSchemaRegistry } from './registry'

// Re-export public API - only what users need
export { registerMessages, getRoom }

// Re-export types that users need
export type { EventContext, EventSchemaRegistry }