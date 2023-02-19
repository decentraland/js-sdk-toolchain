import { AboutResponse } from '@dcl/protocol/out-js/decentraland/bff/http_endpoints.gen'

export function createStaticRealm(): AboutResponse {
  return {
    acceptingUsers: true,
    bff: { healthy: false, publicUrl: `https://peer.decentraland.org/bff` },
    comms: {
      healthy: true,
      protocol: 'v3',
      fixedAdapter: `offline:offline`
    },
    configurations: {
      networkId: 0,
      globalScenesUrn: [],
      scenesUrn: [],
      realmName: 'SdkStaticExport'
    },
    content: {
      healthy: true,
      publicUrl: `https://peer.decentraland.org/content`
    },
    lambdas: {
      healthy: true,
      publicUrl: `https://peer.decentraland.org/lambdas`
    },
    healthy: true
  }
}
