import type { IEngine } from '../engine'
import { Schemas } from '../schemas'
import type { CompositeProvider } from './instance'

let currentProvider: CompositeProvider | null = null

/**
 * Register the composite provider used to resolve composite files. Also registers
 * any `provider.schemas` on the engine pre-seal so composites that reference those
 * components can be instanced without further setup.
 * @public
 */
export function setCompositeProvider(engine: IEngine, provider: CompositeProvider): void {
  currentProvider = provider
  if (!provider.schemas) return
  for (const { name, jsonSchema } of provider.schemas) {
    if (engine.getComponentOrNull(name)) continue
    engine.defineComponentFromSchema(name, Schemas.fromJson(jsonSchema))
  }
}

/**
 * Get the composite provider registered via setCompositeProvider. Returns null if
 * no provider has been set.
 * @public
 */
export function getCompositeProvider(): CompositeProvider | null {
  return currentProvider
}
