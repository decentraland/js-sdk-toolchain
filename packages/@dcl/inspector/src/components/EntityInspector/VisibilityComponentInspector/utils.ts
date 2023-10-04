import { PBVisibilityComponent } from '@dcl/ecs'
import { VisibilityInput } from './types'

export const fromVisibility = (value: PBVisibilityComponent): VisibilityInput => {
  return {
    visible: !!value.visible
  }
}

export const toVisibility = (value: VisibilityInput): PBVisibilityComponent => {
  return {
    visible: value.visible
  }
}
