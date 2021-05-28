/// <reference path="../../packages/decentraland-amd/types.d.ts" />

import { IFuture } from "fp-future";

const globalContext: { dcl: PartialDecentralandInterface, define: Function } = globalThis as any;

export function cleanupAmdEnv() {
  beforeAll(() => {
    var name = require.resolve("../../packages/decentraland-amd");
    delete require.cache[name];
    delete (globalContext as any).define
    delete (globalContext as any).dcl
    require(name);
  });

  afterAll(() => {
    var name = require.resolve("../../packages/decentraland-amd");
    delete require.cache[name];
  });
}

export function resolveFutureWith<T>(f: IFuture<T>, fn: () => Promise<T>){
  fn().then(f.resolve).catch(f.catch)
}

export type ModulesMock = Record<string, () => Promise<any>>;

export function mockEnvironment(modules: ModulesMock) {
  cleanupAmdEnv();

  const starters: CallableFunction[] = [];
  const loadedModuleDescriptors = new Map<string, DclModuleDescriptor>();
  const loadedModulesByHandle = new Map<string, any>();

  it("mocks the environment", () => {
    expect(globalContext.dcl).toBeUndefined();
    expect(globalContext.define).toBeUndefined();

    function getModuleHandle(moduleName: string) {
      return moduleName + "_handle";
    }

    globalContext.dcl = {
      async loadModule(moduleName: string) {
        if (loadedModuleDescriptors.has(moduleName)) {
          return loadedModuleDescriptors.get(moduleName)!;
        }

        if (moduleName in modules) {
          const rpcHandle = getModuleHandle(moduleName);
          const moduleInstance = await modules[moduleName]();

          const ret: DclModuleDescriptor = {
            rpcHandle,
            methods: Object.keys(moduleInstance)
              .filter((key) => typeof moduleInstance[key] == "function")
              .map((key) => {
                return { name: key };
              }),
          };

          loadedModuleDescriptors.set(moduleName, ret);
          loadedModulesByHandle.set(rpcHandle, moduleInstance);

          return ret;
        }

        throw new Error("Unknown module " + moduleName);
      },
      async callRpc(moduleHandle: string, methodName: string, args: any[]) {
        if (!loadedModulesByHandle.has(moduleHandle)) {
          throw new Error("Unknown module handle " + moduleHandle);
        }

        const moduleInstance = loadedModulesByHandle.get(moduleHandle)!;

        if (!moduleInstance[methodName]) {
          throw new Error(`Unknown method '${methodName}'`);
        }

        return moduleInstance.apply(null, args);
      },
      onStart(cb: CallableFunction) {
        starters.push(cb);
      },
    };
  });

  function start() {
    for (let $ of starters) {
      $();
    }
  }

  function define(factory: any): void
  function define(id: string, factory: any): void
  function define(id: string, dependencies: string[], factory: any): void
  function define(this: any, ...args: any[]): void {
    return globalContext.define.apply(this, args)
  }

  return { starters, start, loadedModuleDescriptors, loadedModulesByHandle, define };
}
