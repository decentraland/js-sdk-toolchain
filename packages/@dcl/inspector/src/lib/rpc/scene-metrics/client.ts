import { RPC, Transport } from '@dcl/mini-rpc'
import { SceneMetricsRPC } from './types'

export class SceneMetricsClient extends RPC<SceneMetricsRPC.Method, SceneMetricsRPC.Params, SceneMetricsRPC.Result> {
  constructor(transport: Transport) {
    super(SceneMetricsRPC.name, transport)
  }

  getMetrics = () => {
    return this.request(SceneMetricsRPC.Method.GET_METRICS, undefined)
  }

  getLimits = () => {
    return this.request(SceneMetricsRPC.Method.GET_LIMITS, undefined)
  }

  getEntitiesOutOfBoundaries = () => {
    return this.request(SceneMetricsRPC.Method.GET_ENTITIES_OUT_OF_BOUNDARIES, undefined)
  }
}
