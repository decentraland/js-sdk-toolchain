import { ISchema } from '@dcl/ecs'

// Base type for event schema registry
export type EventSchemaRegistry = Record<string, ISchema>

// Type extraction from schemas
export type EventTypes<T extends EventSchemaRegistry = EventSchemaRegistry> = {
  [K in keyof T]: T[K] extends ISchema<infer U> ? U : never
}

// Global interface that users can augment with their own events
export interface RegisteredEvents extends EventSchemaRegistry {}

// Default empty registry
export const EventSchemas = {} as RegisteredEvents

// Helper to ensure user events conform to the registry type
export type ValidateEventRegistry<T extends EventSchemaRegistry> = T

