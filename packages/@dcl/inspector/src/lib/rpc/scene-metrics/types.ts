import { SceneMetrics } from '../../../redux/scene-metrics/types'

export namespace SceneMetricsRPC {
  export const name = 'SceneMetricsRPC'

  export enum Method {
    GET_METRICS = 'get_metrics',
    GET_LIMITS = 'get_limits',
    GET_ENTITIES_OUT_OF_BOUNDARIES = 'get_entities_out_of_boundaries'
  }

  export type Params = {
    [Method.GET_METRICS]: undefined
    [Method.GET_LIMITS]: undefined
    [Method.GET_ENTITIES_OUT_OF_BOUNDARIES]: undefined
  }

  export type Result = {
    [Method.GET_METRICS]: SceneMetrics
    [Method.GET_LIMITS]: SceneMetrics
    [Method.GET_ENTITIES_OUT_OF_BOUNDARIES]: number
  }
}
