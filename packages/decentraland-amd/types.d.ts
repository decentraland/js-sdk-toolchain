type DclModuleDescriptor = {
  rpcHandle: string
  methods: DclMethodDescriptor[]
}

type DclMethodDescriptor = { name: string }

type PartialDecentralandInterface = {
  loadModule(moduleName: string): PromiseLike<DclModuleDescriptor>
  callRpc(moduleHandle: string, methodName: string, args: ArrayLike<any>): PromiseLike<any>
  onStart(cb: Function): any
}
