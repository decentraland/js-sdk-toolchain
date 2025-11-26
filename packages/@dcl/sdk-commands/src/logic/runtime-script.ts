import { IEngine, Entity, EntityState } from '@dcl/ecs/dist-cjs'

type ScriptLayout = {
  params?: Record<string, { value: unknown }>
}

type Script = {
  entity: Entity
  path: string
  priority: number
  layout?: string
  module: FunctionalScriptModule | Record<string, unknown>
}

type ScriptWithKey = Script & {
  key: string
}

type FunctionalScriptModule = {
  start?: (src: string, entity: Entity, ...params: unknown[]) => void
  update?: (src: string, entity: Entity, dt: number, ...params: unknown[]) => void
  [key: string]: unknown
}

type ScriptClassInstance = {
  start?: () => void
  update?: (dt: number) => void
  [key: string]: unknown
}

type ScriptClass = new (src: string, entity: Entity, ...params: unknown[]) => ScriptClassInstance
type ScriptsByPriority = Record<number, ScriptWithKey[]>

function entityIsRemoved(engine: IEngine, entity: Entity) {
  return engine.getEntityState(entity) === EntityState.Removed
}

/**
 * Initializes and runs all scripts organized by priority.
 * Supports both functional-style scripts (with start/update functions) and class-based scripts.
 * Scripts are extracted at build time from composites.
 *
 * @param engine - The ECS engine instance
 * @param scripts - Scripts with their modules, extracted at build time
 */
export function runScripts(engine: IEngine, scripts: Script[]) {
  const scriptsByPriority = groupScriptsByPriority(scripts)
  const classInstances = new Map<string, { instance: ScriptClassInstance; entity: Entity }>()
  const functionScripts = new Map<
    string,
    { src: string; module: FunctionalScriptModule; entity: Entity; params: unknown[] }
  >()

  for (const [priority, instances] of Object.entries(scriptsByPriority)) {
    for (const script of instances) {
      if (entityIsRemoved(engine, script.entity)) continue

      const module = script.module
      if (!module) {
        console.error('[Script] Unknown module:', script.path)
        continue
      }

      const src = script.path.split('/').slice(0, -1).join('/')
      const layout: ScriptLayout = script.layout ? JSON.parse(script.layout) : {}
      const params = Object.values(layout.params || {}).map((p) => p.value)

      if (typeof module.start === 'function') {
        try {
          module.start(src, script.entity, ...params)
        } catch (e: unknown) {
          console.error('[Script Error] ' + script.path + ' start() failed:', e)
          throw e
        }
        functionScripts.set(script.key, {
          src,
          module: module as FunctionalScriptModule,
          entity: script.entity,
          params
        })
      } else {
        const ScriptClass = Object.values(module).find((exp) => typeof exp === 'function') as ScriptClass | undefined
        if (!ScriptClass) {
          console.error('[Script] No class found in module:', script.path)
          continue
        }

        try {
          const instance = new ScriptClass(src, script.entity, ...params)
          if (typeof instance.start === 'function') {
            instance.start()
          }
          classInstances.set(script.key, { instance, entity: script.entity })
        } catch (e: unknown) {
          console.error('[Script Error] ' + script.path + ' class initialization failed:', e)
          throw e
        }
      }
    }

    engine.addSystem((dt: number) => {
      for (const scriptData of instances) {
        try {
          const classInstance = classInstances.get(scriptData.key)
          if (classInstance && !entityIsRemoved(engine, classInstance.entity)) {
            if (typeof classInstance.instance.update === 'function') {
              classInstance.instance.update(dt)
            }
          } else {
            const functionScript = functionScripts.get(scriptData.key)
            if (functionScript && !entityIsRemoved(engine, functionScript.entity)) {
              if (typeof functionScript.module.update === 'function') {
                functionScript.module.update(functionScript.src, functionScript.entity, dt, ...functionScript.params)
              }
            }
          }
        } catch (e: unknown) {
          console.error('[Script Error] update() failed:', e)
        }
      }
    }, Number(priority))
  }
}

function groupScriptsByPriority(scripts: Script[]): ScriptsByPriority {
  const scriptsByPriority: ScriptsByPriority = {}

  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i]
    const key = `${script.entity}:${script.path}:${i}`

    if (!scriptsByPriority[script.priority]) {
      scriptsByPriority[script.priority] = []
    }

    scriptsByPriority[script.priority].push({ ...script, key })
  }

  return scriptsByPriority
}
