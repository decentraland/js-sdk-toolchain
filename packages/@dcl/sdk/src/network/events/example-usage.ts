/**
 * Example usage of the Event Bus system for client-server communication
 * This file demonstrates how to use the event system in a multiplayer scene
 */

import { engine, Transform, Schemas } from '@dcl/ecs'
import { registerEvents, EventContext, EventSchemaRegistry } from './index'
import { isServer } from '../../network'

// Define your custom event schemas for your game
const MyGameEvents = {
  playerJump: Schemas.Map({
    playerId: Schemas.String,
    position: Schemas.Vector3,
    velocity: Schemas.Float,
    timestamp: Schemas.Int64
  }),

  roundStart: Schemas.Map({
    roundNumber: Schemas.Int,
    duration: Schemas.Int,
    players: Schemas.Array(Schemas.String),
    seed: Schemas.Int
  }),

  chatMessage: Schemas.Map({
    playerId: Schemas.String,
    message: Schemas.String,
    timestamp: Schemas.Int64
  }),

  gameState: Schemas.Map({
    phase: Schemas.String,
    countdown: Schemas.Int,
    players: Schemas.Array(Schemas.String)
  }),

  serverMessage: Schemas.Map({
    message: Schemas.String,
    severity: Schemas.String,
    timestamp: Schemas.Int64
  }),

  playerJoined: Schemas.Map({
    playerId: Schemas.String,
    displayName: Schemas.String,
    timestamp: Schemas.Int64
  })
} as const satisfies EventSchemaRegistry

// Option 1: Register and get typed eventBus in one call
const eventBus = registerEvents(MyGameEvents)

// Option 2: Register first, then get typed eventBus separately  
// registerEvents(MyGameEvents)
// const eventBus = getEventBus<typeof MyGameEvents>()

// Now use eventBus with full type safety!

export function main() {
  if (isServer()) {
    // ========================================
    // SERVER-SIDE CODE
    // ========================================
    
    console.log('Running as authoritative server')
    
    // Track connected players
    const connectedPlayers = new Set<string>()
    
    // Listen for player join (using built-in event)
    eventBus.onMessage('playerJoined', (data, context?: EventContext) => {
      console.log(`Player joined: ${data.displayName} (${context?.from})`)
      connectedPlayers.add(context!.from)
      
      // Send welcome message to the new player
      eventBus.send('serverMessage', {
        message: `Welcome ${data.displayName}! There are ${connectedPlayers.size} players online.`,
        severity: 'info',
        timestamp: Date.now()
      }, { to: [context!.from] })
      
      // Broadcast to all other players
      eventBus.send('serverMessage', {
        message: `${data.displayName} joined the game`,
        severity: 'info',
        timestamp: Date.now()
      })
    })
    
    // Listen for player jumps
    eventBus.onMessage('playerJump', (data, context?: EventContext) => {
      console.log(`Player ${context?.from} jumped at position:`, data.position)
      
      // Validate jump (example: check if position is valid)
      if (data.position.y > 100) {
        // Send error back to player
        eventBus.send('serverMessage', {
          message: 'Invalid jump position!',
          severity: 'error',
          timestamp: Date.now()
        }, { to: [context!.from] })
        return
      }
      
      // Broadcast jump to all other players for synchronization
      // Note: In production, you might want to exclude the sender
      eventBus.send('playerJump', data)
    })
    
    // Listen for chat messages
    eventBus.onMessage('chatMessage', (data, context?: EventContext) => {
      // Add server validation (e.g., profanity filter, rate limiting)
      const validatedMessage = data.message.substring(0, 100) // Limit length
      
      // Broadcast to all players with sender info
      eventBus.send('chatMessage', {
        playerId: context!.from,
        message: validatedMessage,
        timestamp: Date.now()
      })
    })
    
    // Start game rounds periodically (example with timer)
    let roundNumber = 0
    let lastRoundTime = Date.now()
    
    engine.addSystem((_dt: number) => {
      // Every 60 seconds, start a new round
      const now = Date.now()
      if (now - lastRoundTime > 60000) {
        lastRoundTime = now
        roundNumber++
        eventBus.send('roundStart', {
          roundNumber,
          duration: 30000, // 30 seconds
          players: Array.from(connectedPlayers),
          seed: Math.floor(Math.random() * 1000000)
        })
      }
    })
    
  } else {
    // ========================================
    // CLIENT-SIDE CODE
    // ========================================
    
    console.log('Running as client')
    
    // Notify server that we joined
    eventBus.send('playerJoined', {
      playerId: 'local-player', // In production, use actual player ID
      displayName: 'Player Name', // In production, use actual display name
      timestamp: Date.now()
    })
    
    // Listen for server messages
    eventBus.onMessage('serverMessage', (data) => {
      console.log(`[Server ${data.severity}]: ${data.message}`)
      // Display in UI
    })
    
    // Listen for round start
    eventBus.onMessage('roundStart', (data) => {
      console.log(`Round ${data.roundNumber} starting!`)
      console.log(`Duration: ${data.duration}ms`)
      console.log(`Players: ${data.players.join(', ')}`)
      // Initialize round with seed for deterministic gameplay
    })
    
    // Listen for other players' jumps
    eventBus.onMessage('playerJump', (data) => {
      if (data.playerId !== 'local-player') {
        console.log(`Player ${data.playerId} jumped at`, data.position)
        // Update other player's position/animation
      }
    })
    
    // Listen for chat messages
    eventBus.onMessage('chatMessage', (data) => {
      console.log(`[${data.playerId}]: ${data.message}`)
      // Display in chat UI
    })
    
    // Send jump event when player jumps (example function)
    function onPlayerJump(): void {
      const position = Transform.get(engine.PlayerEntity).position
      
      eventBus.send('playerJump', {
        playerId: 'local-player',
        position: position,
        velocity: 5.0,
        timestamp: Date.now()
      })
    }
    
    // Send chat message (example function)
    function sendChatMessage(message: string): void {
      eventBus.send('chatMessage', {
        playerId: 'local-player',
        message: message,
        timestamp: Date.now()
      })
    }
    
    // Example usage (these are just examples, not actually called)
    console.log('Example functions available:', { onPlayerJump, sendChatMessage })
    
    // Example: Trigger jump on spacebar (pseudo-code)
    // InputSystem.onKeyPress(Keys.SPACE, onPlayerJump)
  }
}

/**
 * Advanced patterns:
 * 
 * 1. Request-Response pattern:
 * ```typescript
 * // Client requests data
 * eventBus.send('requestPlayerStats', { playerId: 'abc123' })
 * 
 * // Server responds to specific client
 * eventBus.onMessage('requestPlayerStats', (data, context) => {
 *   const stats = getPlayerStats(data.playerId)
 *   eventBus.send('playerStatsResponse', stats, { to: [context.from] })
 * })
 * ```
 * 
 * 2. Room/Channel pattern:
 * ```typescript
 * // Server maintains rooms
 * const rooms = new Map<string, Set<string>>()
 * 
 * // Broadcast to room members only
 * function broadcastToRoom(roomId: string, event: string, data: any) {
 *   const members = rooms.get(roomId)
 *   if (members) {
 *     eventBus.send(event, data, { to: Array.from(members) })
 *   }
 * }
 * ```
 * 
 * 3. State synchronization:
 * ```typescript
 * // Server maintains authoritative state
 * const gameState = { ... }
 * 
 * // Send state snapshots periodically
 * engine.addSystem(() => {
 *   if (frameCount % 30 === 0) { // Every 30 frames
 *     eventBus.send('stateSnapshot', gameState)
 *   }
 * })
 * ```
 */