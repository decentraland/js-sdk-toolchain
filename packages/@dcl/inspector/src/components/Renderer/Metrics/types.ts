export interface Metrics {
  triangles: number
  entities: number
  bodies: number
  materials: number
  textures: number
}

export enum Limits {
  triangles = 10000,
  entities = 200,
  bodies = 300,
  materials = 20,
  textures = 10
}
