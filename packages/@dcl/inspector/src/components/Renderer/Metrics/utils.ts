import { Limits, type Metrics } from './types'

export function getSceneLimits(parcels: number): Metrics {
  return {
    triangles: parcels * Limits.triangles,
    entities: parcels * Limits.entities,
    bodies: parcels * Limits.bodies,
    materials: Math.floor(Math.log2(parcels + 1) * Limits.materials),
    textures: Math.floor(Math.log2(parcels + 1) * Limits.textures)
  }
}
