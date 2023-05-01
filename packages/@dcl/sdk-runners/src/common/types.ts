/**
 * The runtimes of this project can start a scene in many different runners. Like
 * a WebWorker, an isolated-vm in node, and QuickJS via WASM.
 */

export type RuntimeAbstraction = {
  onStart(): Promise<void>
  onUpdate(deltaTime: number): Promise<void>

  // return false if the runtime should stop
  isRunning(): boolean
}

export type RpcSceneRuntimeOptions = {
  // provide a wrapper to redirect the console.log
  log(...args: any[]): void
  // provide a wrapper to redirect the console.error
  error(...args: any[]): void
  // provide a function that serves as main-loop
  updateLoop: (opts: RuntimeAbstraction) => Promise<void>
}