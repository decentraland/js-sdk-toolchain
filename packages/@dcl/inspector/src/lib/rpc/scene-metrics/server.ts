import { RPC, Transport } from '@dcl/mini-rpc'
import { RootState } from '../../../redux/store'
import { SceneMetricsRPC } from './types'

export class SceneMetricsServer extends RPC<SceneMetricsRPC.Method, SceneMetricsRPC.Params, SceneMetricsRPC.Result> {
  constructor(transport: Transport, store: { getState: () => RootState }) {
    super(SceneMetricsRPC.name, transport)

    this.handle(SceneMetricsRPC.Method.GET_METRICS, async () => {
      return store.getState().sceneMetrics.metrics
    })

    this.handle(SceneMetricsRPC.Method.GET_LIMITS, async () => {
      return store.getState().sceneMetrics.limits
    })

    this.handle(SceneMetricsRPC.Method.GET_ENTITIES_OUT_OF_BOUNDARIES, async () => {
      return store.getState().sceneMetrics.entitiesOutOfBoundaries
    })
  }
}
