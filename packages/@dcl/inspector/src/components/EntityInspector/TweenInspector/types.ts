import { Entity } from '@dcl/ecs'
import { TweenType } from '@dcl/asset-packs'

export interface Props {
  entity: Entity
}

export type TweenInput = {
  type: TweenType
  start: {
    x: string
    y: string
    z: string
  }
  end: {
    x: string
    y: string
    z: string
  }
  easingFunction: string
  duration: string
  playing?: boolean
  relative?: boolean
}

export type TweenSequenceInput = {
  loop?: boolean
}
