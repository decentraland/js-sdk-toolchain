import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { Schemas } from '@dcl/ecs'
import { EventSchemas, EventTypes, EventSchemaRegistry } from './registry'

// Event envelope that wraps all events with metadata
const EventEnvelope = Schemas.Map({
  eventType: Schemas.String,
  timestamp: Schemas.Int64
})

/**
 * Encode an event into a binary buffer
 * @param eventType - The type of event from the registry
 * @param data - The event data matching the schema
 * @param registry - Optional custom registry (defaults to EventSchemas)
 * @returns Binary buffer containing the encoded event
 */
export function encodeEvent<T extends EventSchemaRegistry = typeof EventSchemas, K extends keyof T = keyof T>(
  eventType: K,
  data: EventTypes<T>[K],
  registry: T = EventSchemas as T
): Uint8Array {
  const buffer = new ReadWriteByteBuffer()

  // Write envelope with event type and timestamp
  EventEnvelope.serialize(
    {
      eventType: eventType as string,
      timestamp: Date.now()
    },
    buffer
  )

  // Get the schema for this event type
  const schema = registry[eventType]
  if (!schema) {
    throw new Error(`Unknown event type: ${String(eventType)}`)
  }

  // Write the typed payload
  schema.serialize(data, buffer)

  return buffer.toBinary()
}

/**
 * Decode a binary buffer into an event
 * @param data - Binary buffer containing the encoded event
 * @param registry - Optional custom registry (defaults to EventSchemas)
 * @returns Decoded event with type, payload, and timestamp
 */
export function decodeEvent<T extends EventSchemaRegistry = typeof EventSchemas>(
  data: Uint8Array,
  registry: T = EventSchemas as T
): {
  eventType: keyof T
  payload: EventTypes<T>[keyof T]
  timestamp: number
} {
  const buffer = new ReadWriteByteBuffer()
  buffer.writeBuffer(data, false)

  // Read envelope
  const envelope = EventEnvelope.deserialize(buffer)
  const eventType = envelope.eventType as keyof T

  // Get the schema for this event type
  const schema = registry[eventType]
  if (!schema) {
    throw new Error(`Unknown event type: ${String(eventType)}`)
  }

  // Read the typed payload
  const payload = schema.deserialize(buffer)

  return {
    eventType,
    payload,
    timestamp: envelope.timestamp
  }
}

/**
 * Validate if an event type exists in the registry
 * @param eventType - The event type to check
 * @param registry - Optional custom registry (defaults to EventSchemas)
 * @returns True if the event type exists
 */
export function isValidEventType<T extends EventSchemaRegistry = typeof EventSchemas>(
  eventType: string,
  registry: T = EventSchemas as T
): eventType is Extract<keyof T, string> {
  return eventType in registry
}
