import { RuntimeServiceDefinition } from '@dcl/protocol/out-ts/decentraland/kernel/apis/runtime.gen'
import { RpcClientPort } from '@dcl/rpc'
import * as codegen from '@dcl/rpc/dist/codegen'
import { Scene } from '@dcl/schemas'

export async function getStartupData(port: RpcClientPort) {
  // we are going to need to load a remote module for this RPC client. the module
  // will provide all the information to run the scene
  const runtime = codegen.loadService(port, RuntimeServiceDefinition)

  // first we will fetch the information about the entity
  const sceneInfo = await runtime.getSceneInformation({})

  const scene: Scene = JSON.parse(sceneInfo.metadataJson || '{}')

  if (!scene || !scene.main) {
    throw new Error(`No boostrap data`)
  }

  // look for the "bin/game.js" or similar specified in the .main field
  const mainFileName = scene.main
  const mainFile = await runtime.readFile({ fileName: mainFileName })

  return { mainFile, scene, mainFileName }
}