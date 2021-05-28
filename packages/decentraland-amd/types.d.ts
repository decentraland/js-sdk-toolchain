type DclModuleDescriptor = {
  rpcHandle: string
  methods: DclMethodDescriptor[]
}

type DclMethodDescriptor = { name: string }

type PartialDecentralandInterface = {
  loadModule(moduleName: string, exports: any): Promise<DclModuleDescriptor>
  callRpc(moduleHandle: string, methodName: string, args: ArrayLike<any>): Promise<any>
  onStart(cb: Function): any
}
