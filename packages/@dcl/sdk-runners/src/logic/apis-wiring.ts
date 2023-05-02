import { RpcServerPort } from '@dcl/rpc'
import { EngineApiServiceDefinition } from '@dcl/protocol/out-js/decentraland/kernel/apis/engine_api.gen'
import * as codegen from '@dcl/rpc/dist/codegen'
import { SceneContext } from './scene-context'
import { RealmInfo, RuntimeServiceDefinition } from '@dcl/protocol/out-js/decentraland/kernel/apis/runtime.gen'

export function setupEngineApiService(port: RpcServerPort<SceneContext>) {
  codegen.registerService(port, EngineApiServiceDefinition, async () => ({
    async crdtGetState(payload, ctx) {
      return ctx.crdtGetState()
    },
    async crdtSendToRenderer(data, ctx) {
      return ctx.crdtSendToRenderer(data)
    },
    crdtGetMessageFromRenderer() {
      throw new Error('crdtSendToRenderer not implemented')
    },
    sendBatch() {
      throw new Error('sendBatch not implemented')
    },
    subscribe() {
      throw new Error('subscribe not implemented')
    },
    unsubscribe() {
      throw new Error('unsubscribe not implemented')
    }
  }))
}

export function setupRuntimeService(
  port: RpcServerPort<SceneContext>,
  realmGetter: () => RealmInfo | Promise<RealmInfo | undefined> | undefined
) {
  codegen.registerService(port, RuntimeServiceDefinition, async () => ({
    async getRealm() {
      return {
        realmInfo: await realmGetter()
      }
    },
    readFile(data, ctx) {
      return ctx.readFile(data.fileName)
    },
    async getSceneInformation(req, ctx) {
      return {
        baseUrl: ctx.loadableScene.baseUrl,
        content: ctx.loadableScene.entity.content,
        metadataJson: JSON.stringify(ctx.loadableScene.entity.metadata),
        urn: ctx.loadableScene.urn
      }
    },
    async getWorldTime() {
      return {
        seconds: 12 * 3600
      }
    }
  }))
}
