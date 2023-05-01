/**
 * The following object specifies the global functions added to all scene runtimes
 * as defined in https://adr.decentraland.org/adr/ADR-133.
 *
 * For now, we only map log, error and require. At this stage, fetch and WebSocket
 * are purposely left out of scope.
 **/
export type ProvideOptions = {
  // console.log
  log(...args: any[]): void
  // console.error
  error(...args: any[]): void
  // global Common.js-like require
  require(module: string): any
}

/**
 * This is the return type of a VM wrapper
 */
export type RunWithVmOptions = {
  /**
   * Evaluates code inside the VM
   */
  eval(code: string, filename?: string): void
  /**
   * Runs an update tick, calling the exports.onUpdate function as per ADR-133
   */
  onUpdate(dt: number): Promise<any>
  /**
   * Runs the exports.onStart function as per ADR-133
   */
  onStart(): Promise<void>
  /**
   * Used to configure the VM with custom handlers.
   */
  provide(opts: ProvideOptions): void

  getStats(): { opcodes: OpCodeResult[]; memory: MemoryDump }
  dumpMemory(): string

  /**
   * @deprecated this is an internal testing function. Do not use
   */
  onServerUpdate(data: Uint8Array): Promise<Uint8Array>
}

export type OpCodeResult = { count: bigint; opcode: number }
export type MemoryDump = {
  malloc_limit: number
  memory_used_size: number
  malloc_count: number
  memory_used_count: number
  atom_count: number
  atom_size: number
  str_count: number
  str_size: number
  obj_count: number
  obj_size: number
  prop_count: number
  prop_size: number
  shape_count: number
  shape_size: number
  js_func_count: number
  js_func_size: number
  js_func_code_size: number
  js_func_pc2line_count: number
  js_func_pc2line_size: number
  c_func_count: number
  array_count: number
  fast_array_count: number
  fast_array_elements: number
  binary_object_count: number
  binary_object_size: number
}

// TODO: This type exists because there is a missing reliable and recursive way to
// pass Uint8Array as object values from the VM context to the HOST context
export type MaybeUint8Array = Uint8Array | Record<string, number>
