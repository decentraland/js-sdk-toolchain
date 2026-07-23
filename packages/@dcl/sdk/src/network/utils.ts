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

export const AUTHORITATIVE_SERVER_ADDRESS = 'authoritative-server'

export function shouldAnswerStateRequest(opts: {
  runsOnServer: boolean
  requesterAddress: string
  hasSeenAuthoritativeServer: boolean
  myAddress: string | undefined
  knownAddresses: Iterable<string>
}): boolean {
  if (opts.runsOnServer) return true
  if (opts.requesterAddress === AUTHORITATIVE_SERVER_ADDRESS) {
    return shouldRespondToStateRequest(opts.myAddress, opts.requesterAddress, opts.knownAddresses)
  }
  if (opts.hasSeenAuthoritativeServer) return false
  return shouldRespondToStateRequest(opts.myAddress, opts.requesterAddress, opts.knownAddresses)
}

export const MAX_STATE_RESPONDERS = 2

export function shouldRespondToStateRequest(
  myAddress: string | undefined,
  requesterAddress: string,
  knownAddresses: Iterable<string>
): boolean {
  if (!myAddress) return true

  const self = myAddress.toLowerCase()
  const requester = requesterAddress.toLowerCase()

  if (self === requester) return false

  const candidates = new Set<string>([self])
  for (const address of knownAddresses) {
    const candidate = address.toLowerCase()
    if (candidate && candidate !== requester) {
      candidates.add(candidate)
    }
  }

  if (candidates.size <= MAX_STATE_RESPONDERS) return true

  const ranked = Array.from(candidates).sort(
    (a, b) => stateResponderRank(a, requester) - stateResponderRank(b, requester) || (a < b ? -1 : 1)
  )
  return ranked.indexOf(self) < MAX_STATE_RESPONDERS
}

function stateResponderRank(address: string, requester: string): number {
  const value = `${address}:${requester}`
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
