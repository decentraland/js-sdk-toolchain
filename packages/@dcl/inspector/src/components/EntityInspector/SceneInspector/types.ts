import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type SpawnPointInput = {
  position: {
    x: number
    y: number
    z: number
  }
  randomOffset: boolean
  maxOffset: number
  cameraTarget: {
    x: number
    y: number
    z: number
  }
}

export type SceneInput = {
  name: string
  description: string
  thumbnail: string
  ageRating: string
  categories: string[]
  tags: string
  author: string
  email: string
  silenceVoiceChat: boolean
  disablePortableExperiences: boolean
  spawnPoints: SpawnPointInput[]
  layout: {
    parcels: string
  }
}
