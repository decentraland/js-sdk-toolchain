import { AboutResponse } from '@dcl/protocol/out-js/decentraland/bff/http_endpoints.gen'
import { CliComponents } from '../components'
import { getCatalystBaseUrl } from './config'

export async function createStaticRealm(components: Pick<CliComponents, 'config'>): Promise<AboutResponse> {
  const catalystUrl = await getCatalystBaseUrl(components)
  return {
    acceptingUsers: true,
    bff: { healthy: false, publicUrl: `${catalystUrl}/bff` },
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
      publicUrl: `${catalystUrl}/content`
    },
    lambdas: {
      healthy: true,
      publicUrl: `${catalystUrl}/lambdas`
    },
    healthy: true
  }
}
