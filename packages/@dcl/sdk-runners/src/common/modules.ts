/**
 * This file contains the module bindings for the client VM of the SDK.
 */

import {
  EngineApiServiceDefinition,
  CrdtSendToRendererRequest
} from '@dcl/protocol/out-js/decentraland/kernel/apis/engine_api.gen'
import { TestingServiceDefinition } from '@dcl/protocol/out-js/decentraland/kernel/apis/testing.gen'
import { RpcClientPort } from '@dcl/rpc'
import * as codegen from '@dcl/rpc/dist/codegen'
import { coerceMaybeU8Array } from '../quick-js/convert-values'
import { RuntimeServiceDefinition } from '@dcl/protocol/out-js/decentraland/kernel/apis/runtime.gen'
import { UserIdentityServiceDefinition } from '@dcl/protocol/out-js/decentraland/kernel/apis/user_identity.gen'

// TODO: this file could be auto-generated

export function loadModuleForPort(port: RpcClientPort, moduleName: string) {
  switch (moduleName) {
    case '~system/EngineApi':
      const originalService = codegen.loadService(port, EngineApiServiceDefinition)

      // WARNING: quickJs is not yet capable of handling Uint8Array, so we need to coerce the Uint8Array
      //          values manually. This is a temporary solution until the proper fix is implemented
      return {
        ...originalService,
        async crdtSendToRenderer(payload: CrdtSendToRendererRequest) {
          return await originalService.crdtSendToRenderer({ data: coerceMaybeU8Array(payload.data) })
        }
      }
    case '~system/Runtime':
      return codegen.loadService(port, RuntimeServiceDefinition)
    case '~system/UserIdentity':
      return codegen.loadService(port, UserIdentityServiceDefinition)
    case '~system/Testing':
      return codegen.loadService(port, TestingServiceDefinition)
    default:
      throw new Error('The following module is not available ' + moduleName)
  }
}
