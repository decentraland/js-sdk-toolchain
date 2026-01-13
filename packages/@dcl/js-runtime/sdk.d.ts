// @internal
declare module '~sdk/all-composites' {
  export const compositeFromLoader: Record<string, Uint8Array | string>
}

// @internal
declare module '~sdk/all-scripts' {
  type Entity = number; // this will get replaced with the proper import at scene build time

  /**
   * Registry interface that maps script paths to their types.
   * This interface is populated at build time with actual script paths.
   * It starts empty and gets augmented during scene builds.
   */
  export interface ScriptRegistry {}

  /**
   * Type utility to extract the instance type from a script module.
   * For class-based scripts, extracts the class instance type.
   * For functional scripts, returns the module type itself.
   */
  export type ExtractScriptType<T> = T extends Record<string, any>
    ? { [K in keyof T]: T[K] extends new (...args: any[]) => infer Instance ? Instance : never }[keyof T] extends never
      ? T
      : { [K in keyof T]: T[K] extends new (...args: any[]) => infer Instance ? Instance : never }[keyof T]
    : never

  /**
   * @deprecated
   * @internal This function is called automatically by the SDK entry point.
   * Users should not call this function directly.
   */
  export function _initializeScripts(engine: any): void

  /**
   * Get a specific script instance by entity and script path.
   * TypeScript will automatically infer the return type based on the script path.
   */
  export function getScriptInstance<K extends keyof ScriptRegistry>(entity: Entity, scriptPath: K): ScriptRegistry[K] | null
  export function getScriptInstance<T = any>(entity: Entity, scriptPath: string): T | null

  /**
   * Get all instances of a specific script (across all entities).
   * TypeScript will automatically infer the instance type based on the script path.
   */
  export function getScriptInstancesByPath<K extends keyof ScriptRegistry>(scriptPath: K): Array<{ entity: Entity; instance: ScriptRegistry[K] }>
  export function getScriptInstancesByPath<T = any>(scriptPath: string): Array<{ entity: Entity; instance: T }>

  /**
   * Get all script instances attached to a specific entity
   */
  export function getAllScriptInstances(entity: Entity): Array<{ path: string; instance: any }>

  /**
   * Call a method on a script instance (with safety checks).
   * TypeScript will automatically infer method names, parameter types, and return types.
   */
  export function callScriptMethod<
    K extends keyof ScriptRegistry,
    M extends keyof ScriptRegistry[K]
  >(
    entity: Entity,
    scriptPath: K,
    methodName: M,
    ...args: ScriptRegistry[K][M] extends (...args: infer P) => any ? P : never
  ): ScriptRegistry[K][M] extends (...args: any[]) => infer R ? R : never
  export function callScriptMethod(entity: Entity, scriptPath: string, methodName: string, ...args: any[]): any
}
