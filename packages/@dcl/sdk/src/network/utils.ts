import { EngineInfo as _EngineInfo, NetworkEntity as _NetworkEntity } from '@dcl/ecs'
import { componentNumberFromName } from '@dcl/ecs/dist/components/component-number'

import type { GetUserDataRequest, GetUserDataResponse } from '~system/UserIdentity'
import { IProfile } from './message-bus-sync'

// Retrieve userId to start sending this info as the networkId
export function fetchProfile(
  myProfile: IProfile,
  getUserData: (value: GetUserDataRequest) => Promise<GetUserDataResponse>
) {
  void getUserData({}).then(({ data }) => {
    if (data?.userId) {
      const userId = data.userId
      const networkId = componentNumberFromName(data.userId)
      myProfile.networkId = networkId
      myProfile.userId = userId
    } else {
      throw new Error(`Couldn't fetch profile data`)
    }
  })
}
