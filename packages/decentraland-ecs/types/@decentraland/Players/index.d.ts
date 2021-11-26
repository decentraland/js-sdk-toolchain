declare module '@decentraland/Players' {
  export type ColorString = string

  export type Snapshots = {
    face: string
    face256: string
    face128: string
    body: string
  }

  export type AvatarForUserData = {
    bodyShape: WearableId
    skinColor: ColorString
    hairColor: ColorString
    eyeColor: ColorString
    wearables: WearableId[]
    snapshots: Snapshots
  }

  export type UserData = {
    displayName: string
    publicKey: string | null
    hasConnectedWeb3: boolean
    userId: string
    version: number
    avatar: AvatarForUserData
  }

  /**
   * Return the players's data
   */
  export function getPlayerData(opt: { userId: string }): Promise<UserData | null>

  /**
   * Return array of connected players
   */
  export function getConnectedPlayers(): Promise<{ userId: string }[]>

  /**
   * Return array of players inside the scene
   */
  export function getPlayersInScene(): Promise<{ userId: string }[]>
}
