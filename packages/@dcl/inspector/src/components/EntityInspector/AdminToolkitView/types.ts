import { Entity } from '@dcl/ecs'

export type Props = {
  entity: Entity
}

export type AdminToolkitData = {
  defaultAdminPermissions: string
  authorizedUsers: string
  disableSound: boolean
  showAuthorVideo: boolean
  linkAllScreens: boolean
  screens: string[]
  adminAllowList: string[]
  kickCoordinates: {
    x: number
    y: number
    z: number
  }
  allowNonOwners: boolean
  playSound: boolean
  showAuthorText: boolean
  linkAllSmartItems: boolean
  smartItems: string[]
}
