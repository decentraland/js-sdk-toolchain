import { IEngine, Entity, EntityState } from '@dcl/ecs/dist-cjs'
import { type ActionRef, getActionEvents } from '@dcl/asset-packs'

declare global {
  var __DCL_SCRIPT_INSTANCES__: Map<string, { instance: any; entity: Entity; path: string }>
}

if (!globalThis.__DCL_SCRIPT_INSTANCES__) {
  globalThis.__DCL_SCRIPT_INSTANCES__ = new Map()
}

type ScriptParam = {
  type?: string
  value: unknown
}

type ScriptLayout = {
  params?: Record<string, ScriptParam>
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
 * Get a specific script instance by entity and script path.
 * @param entity - The entity ID
 * @param scriptPath - The script file path
 * @returns The script instance or null if not found
 */
export function getScriptInstance(entity: Entity, scriptPath: string): any {
  const key = `${entity}:${scriptPath}`
  const entry = globalThis.__DCL_SCRIPT_INSTANCES__.get(key)
  return entry?.instance || null
}

/**
 * Get all instances of a specific script (across all entities).
 * @param scriptPath - The script file path
 * @returns Array of { entity, instance } objects
 */
export function getScriptInstancesByPath(scriptPath: string): Array<{ entity: Entity; instance: any }> {
  const results: Array<{ entity: Entity; instance: any }> = []
  for (const [_, value] of globalThis.__DCL_SCRIPT_INSTANCES__) {
    if (value.path === scriptPath) {
      results.push({ entity: value.entity, instance: value.instance })
    }
  }
  return results
}

/**
 * Get all script instances attached to a specific entity
 * @param entity - The entity ID
 * @returns Array of { path, instance } objects
 */
export function getAllScriptInstances(entity: Entity): Array<{ path: string; instance: any }> {
  const results: Array<{ path: string; instance: any }> = []
  for (const [_, value] of globalThis.__DCL_SCRIPT_INSTANCES__) {
    if (value.entity === entity) {
      results.push({ path: value.path, instance: value.instance })
    }
  }
  return results
}

/**
 * Call a method on a script instance (with safety checks).
 * @param entity - The entity ID
 * @param scriptPath - The script file path
 * @param methodName - The method name to call
 * @param args - Arguments to pass to the method
 * @returns The method's return value or undefined if method not found
 */
export function callScriptMethod(entity: Entity, scriptPath: string, methodName: string, ...args: any[]): any {
  const instance = getScriptInstance(entity, scriptPath)
  if (instance && typeof instance[methodName] === 'function') {
    return instance[methodName](...args)
  }
  console.error(`Method ${methodName} not found on script ${scriptPath} for entity ${entity}`)
  return undefined
}

/**
 * Creates an ActionCallback function from an ActionRef.
 * The returned function, when called, will trigger the specified action on the entity.
 *
 * @param actionRef - The action reference containing entity and action name
 * @returns A function that triggers the action when called
 */
function createActionCallback(actionRef: ActionRef): () => void {
  return () => {
    if (!actionRef.entity || !actionRef.action) {
      console.error('[Script] ActionCallback called with invalid action reference:', actionRef)
      return
    }
    const actionEvents = getActionEvents(actionRef.entity)
    actionEvents.emit(actionRef.action, {})
  }
}

/**
 * Resolves script parameters, converting ActionRef values to ActionCallback functions.
 *
 * @param params - The raw parameters from the script layout
 * @returns Array of resolved parameter values
 */
function resolveScriptParams(params: Record<string, ScriptParam>): unknown[] {
  return Object.values(params).map((param) => {
    if (param.type === 'action' && param.value && typeof param.value === 'object') {
      const actionRef = param.value as ActionRef
      return createActionCallback(actionRef)
    }
    return param.value
  })
}

/**
 * Initializes and runs all scripts organized by priority.
 * Supports both functional-style scripts (with start/update functions) and class-based scripts.
 * Scripts are extracted at build time from composites.
 *
 * @internal This function is called automatically by the SDK entry point.
 * Users should not call this function directly.
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
      const params = resolveScriptParams(layout.params || {})
      const registryKey = `${script.entity}:${script.path}`

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
        globalThis.__DCL_SCRIPT_INSTANCES__.set(registryKey, {
          instance: module,
          entity: script.entity,
          path: script.path
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
          globalThis.__DCL_SCRIPT_INSTANCES__.set(registryKey, {
            instance: instance,
            entity: script.entity,
            path: script.path
          })
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
