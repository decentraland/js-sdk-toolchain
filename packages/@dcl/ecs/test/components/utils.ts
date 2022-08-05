import { Engine, IEngine } from '../../src/engine'

export async function ensureEngineAndComponents() {
  const newEngine = Engine()
  ;(globalThis as any).engine = newEngine

  const module = await import(
    './../../src/components/generated/index.namespace.gen'
  )

  return {
    engine: newEngine,
    components: module.Components
  }
}
export async function ensureComponentsFromEngine(engine: IEngine) {
  ;(globalThis as any).engine = engine
  const module = await import(
    './../../src/components/generated/index.namespace.gen'
  )
  return module.Components
}
