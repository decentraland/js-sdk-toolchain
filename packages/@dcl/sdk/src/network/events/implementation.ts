import { BinaryMessageBus, CommsMessage } from '../binary-message-bus'
import { AUTH_SERVER_PEER_ID } from '../constants'
import { EventTypes, EventSchemaRegistry } from './registry'
import { encodeEvent, decodeEvent } from './protocol'
import { Atom } from '../../atom'

// Context provided to server-side event handlers
export type EventContext = {
  from: string
}

// Event callback type - server gets context, client doesn't
export type EventCallback<T> = (data: T, context?: EventContext) => void

// Options for sending events
export type SendOptions = {
  to?: string[] // Target specific peers (server only)
}

/**
 * Room provides type-safe communication between clients and server
 * Uses binary serialization with Schema definitions for efficiency
 */
type QueuedMessage<T extends EventSchemaRegistry = EventSchemaRegistry> = {
  [K in keyof T]: {
    eventType: K
    data: EventTypes<T>[K]
    options?: SendOptions
  }
}[keyof T]

export class Room<T extends EventSchemaRegistry = EventSchemaRegistry> {
  private listeners = new Map<keyof T, Set<EventCallback<any>>>()
  private messageQueue: QueuedMessage<T>[] = []
  private isProcessingQueue = false

  constructor(
    private binaryMessageBus: ReturnType<typeof BinaryMessageBus>,
    private isServerAtom: Atom<boolean>,
    private isRoomReadyAtom: Atom<boolean>
  ) {
    this.isRoomReadyAtom.observable.add((isReady) => {
      if (isReady && this.messageQueue.length > 0) {
        void this.flushMessageQueue()
      }
    })
    binaryMessageBus.on(CommsMessage.CUSTOM_EVENT, (data, sender) => {
      try {
        const { eventType, payload } = decodeEvent(data, globalEventRegistry)
        const callbacks = this.listeners.get(eventType)

        if (callbacks) {
          callbacks.forEach(async (cb) => {
            if (await this.isServerAtom.deref()) {
              // Server handlers receive sender context
              cb(payload, { from: sender })
            } else if (sender === AUTH_SERVER_PEER_ID) {
              // Client only processes events from authoritative server
              cb(payload)
            }
          })
        }
      } catch (error) {
        console.error('[EventBus] Failed to decode event:', error)
      }
    })
  }

  /**
   * Flush queued messages when room becomes ready
   */
  private async flushMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return

    this.isProcessingQueue = true

    // Copy and clear the queue to avoid mutation during iteration
    const messages = [...this.messageQueue]
    this.messageQueue.length = 0

    // Re-send all queued messages
    for (const message of messages) {
      await this.send(message.eventType, message.data, message.options)
    }

    this.isProcessingQueue = false
  }

  /**
   * Send an event
   * @param eventType - The type of event from the registry
   * @param data - The event data matching the schema
   * @param options - Optional send options (server only)
   *
   * Messages are automatically queued if the room is not ready and sent once connected.
   */
  async send<K extends keyof T>(eventType: K, data: EventTypes<T>[K], options?: SendOptions): Promise<void> {
    try {
      const isRoomReady = this.isRoomReadyAtom.getOrNull() ?? false

      // If room is not ready, queue the message with original params
      if (!isRoomReady) {
        this.messageQueue.push({
          eventType,
          data,
          options
        })
        return
      }

      // Room is ready, send immediately
      const buffer = encodeEvent(eventType as string, data, globalEventRegistry)

      if (await this.isServerAtom.deref()) {
        // Server can send to specific clients or broadcast
        this.binaryMessageBus.emit(CommsMessage.CUSTOM_EVENT, buffer, options?.to)
      } else {
        // Client always sends to authoritative server
        this.binaryMessageBus.emit(CommsMessage.CUSTOM_EVENT, buffer, [AUTH_SERVER_PEER_ID])
      }
    } catch (error) {
      console.error(`[EventBus] Failed to send event '${String(eventType)}':`, error)
    }
  }

  /**
   * Listen for an event
   * @param eventType - The type of event to listen for
   * @param callback - Callback to handle the event
   * @returns Unsubscribe function
   */
  onMessage<K extends keyof T>(eventType: K, callback: EventCallback<EventTypes<T>[K]>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }

    const callbacks = this.listeners.get(eventType)!
    callbacks.add(callback)

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.listeners.delete(eventType)
      }
    }
  }

  /**
   * Remove all listeners for a specific event type
   * @param eventType - The type of event to clear listeners for
   */
  clear<K extends keyof T>(eventType?: K): void {
    if (eventType) {
      this.listeners.delete(eventType)
    } else {
      this.listeners.clear()
    }
  }

  /**
   * Get the number of listeners for an event type
   * @param eventType - The type of event to check
   * @returns Number of registered listeners
   */
  listenerCount<K extends keyof T>(eventType: K): number {
    return this.listeners.get(eventType)?.size ?? 0
  }

  /**
   * Check if the room is ready to send messages
   * @returns true if messages will be sent immediately, false if they will be queued
   */
  isReady(): boolean {
    return this.isRoomReadyAtom.getOrNull() ?? false
  }

  /**
   * Subscribe to room readiness changes
   * @param callback - Called when room becomes ready or disconnected
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsubscribe = room.onReady((isReady) => {
   *   if (isReady) {
   *     console.log('Room connected!')
   *   } else {
   *     console.log('Room disconnected')
   *   }
   * })
   *
   * // Later: unsubscribe()
   * ```
   */
  onReady(callback: (isReady: boolean) => void): () => void {
    const observer = this.isRoomReadyAtom.observable.add((isReady) => {
      callback(isReady)
    })

    return () => {
      if (observer) {
        this.isRoomReadyAtom.observable.remove(observer)
      }
    }
  }
}

// Global registry for user-defined events
const globalEventRegistry: EventSchemaRegistry = {}

/**
 * Get the global event registry (internal use)
 * @internal
 */
export function getEventRegistry(): EventSchemaRegistry {
  return globalEventRegistry
}

// Global room instance (created by addSyncTransport)
let globalRoom: Room | null = null

/**
 * Set the global room instance (internal use)
 * @internal
 */
export function setGlobalRoom(roomInstance: Room): void {
  globalRoom = roomInstance
}

/** message keys the SDK keeps for itself, so its own traffic can never clash with a scene's */
const RESERVED_MESSAGE_PREFIX = '~sdk/'

/**
 * Register message schemas for use with the room
 * Call this before main() to define your custom messages
 *
 * The registry is flat and global: a key names the same message for every peer in
 * the room. Registering one twice is therefore reported — the last schema wins,
 * and any peer still holding the earlier one decodes the payload as garbage.
 * Keys under `~sdk/` are reserved for SDK-internal messages and are not registered.
 *
 * @param messages - Object containing your message schemas
 * @returns Typed room instance for your registered messages
 */
export function registerMessages<T extends EventSchemaRegistry>(messages: T): Room<T> {
  for (const [key, schema] of Object.entries(messages)) {
    // reported through `error` and not `warn`: the scene runtime's console has
    // only `log` and `error`
    if (key.startsWith(RESERVED_MESSAGE_PREFIX)) {
      console.error(`[Room] ignoring '${key}': the '${RESERVED_MESSAGE_PREFIX}' prefix is reserved for the SDK`)
      continue
    }
    if (key in globalEventRegistry) {
      console.error(`[Room] message '${key}' is already registered; the schema registered last is the one that decodes`)
    }
    globalEventRegistry[key] = schema
  }
  if (!globalRoom) {
    throw new Error('Room not initialized. Make sure the SDK network transport is initialized.')
  }
  return globalRoom as unknown as Room<T>
}

/**
 * Get a typed version of the global room
 * Use this when you want the room with your specific message types
 *
 * @example
 * ```typescript
 * const MyMessages = { ... }
 * registerMessages(MyMessages) // Register first
 * const room = getRoom<typeof MyMessages>() // Then get typed version
 * ```
 */
export function getRoom<T extends EventSchemaRegistry>(): Room<T> {
  if (!globalRoom) {
    throw new Error('Room not initialized. Make sure the SDK network transport is initialized.')
  }
  return globalRoom as unknown as Room<T>
}
