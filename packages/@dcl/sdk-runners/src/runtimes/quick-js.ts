/**
 * This file implements a QuickJS runtime that runs in the context of a RpcClient.
 * It can run inside WebWorkers and the RPC will abstract all the communication with
 * the main thread. The @dcl/rpc module was designed with the performance considerations
 * of this application in mind.
 * 
 * Based on static service definitions (i.e. EngineApiServiceDefinition) the @dcl/rpc
 * framework tenerates asynchronous clients to communicate with the rpc counterpart.
 */

import { RpcClientPort } from '@dcl/rpc'
import { withQuickJsVm } from '../quick-js'
import { loadModuleForPort } from '../common/modules'
import { RpcSceneRuntimeOptions } from '../common/types'
import { getStartupData } from '../common/startup'

// this function starts the scene runtime as explained in ADR-133
export async function startQuickJsSceneRuntime(port: RpcClientPort, options: RpcSceneRuntimeOptions) {
  const { mainFile, mainFileName } = await getStartupData(port)
  await withQuickJsVm(async (opts) => {
    opts.provide({
      ...options,
      require(moduleName) {
        return loadModuleForPort(port, moduleName)
      },
    })

    const decoder = new TextDecoder()
    await opts.eval(decoder.decode(mainFile.content), mainFileName)

    await options.updateLoop({ ...opts, isRunning: () => (port.state === 'open') })
  })
}

