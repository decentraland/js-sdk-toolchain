import { ReadOnlyColor4 } from '@dcl/ecs-math'

/** @public */
export enum InputEventType {
  DOWN,
  UP
}

/** @public */
export enum CameraMode {
  FirstPerson = 0,
  ThirdPerson = 1,
  // @internal
  BuildingToolGodMode = 2
}

// @internal
export const AVATAR_OBSERVABLE = 'AVATAR_OBSERVABLE'

/**
 * @public
 */
export type WearableId = string

/**
 * @public
 */
export type AvatarForRenderer = {
  bodyShape: WearableId
  skinColor: ReadOnlyColor4
  hairColor: ReadOnlyColor4
  eyeColor: ReadOnlyColor4
  wearables: WearableId[]
}

/**
 * @public
 */
export type Wearable = {
  id: WearableId
  type: 'wearable'
  category: string
  baseUrl: string
  tags: string[]
  representations: BodyShapeRespresentation[]
}

/**
 * @public
 */
export type BodyShapeRespresentation = {
  bodyShapes: string[]
  mainFile: string
  contents: FileAndHash[]
}

/**
 * @public
 */
export type FileAndHash = {
  file: string
  hash: string
}

/**
 * @public
 */
export type ProfileForRenderer = {
  userId: string
  name: string
  description: string
  email: string
  avatar: AvatarForRenderer
  snapshots: {
    face: string
    body: string
  }
  version: number
  hasConnectedWeb3: boolean
  updatedAt?: number
  createdAt?: number
  parcelsWithAccess?: ParcelsWithAccess
}

/** @public */
export type ParcelsWithAccess = Array<{
  x: number
  y: number
  role: LandRole
}>

/** @public */
export enum LandRole {
  OWNER = 'owner',
  OPERATOR = 'operator'
}

/**
 * @public
 */
export type MinimapSceneInfo = {
  name: string
  owner: string
  description: string
  previewImageUrl: string | undefined
  type: number
  parcels: { x: number; y: number }[]
  isPOI: boolean
}
