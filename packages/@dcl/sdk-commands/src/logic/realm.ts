import { AboutResponse } from '@dcl/protocol/out-ts/decentraland/realm/about.gen'
import { CliComponents } from '../components'
import { getCatalystBaseUrl } from './config'
import { generateParcelMap, getSizesByCoords } from './map/map-parcels'

export async function createStaticRealm(
  components: Pick<CliComponents, 'config' | 'fs'>,
  sceneParcels: string[][]
): Promise<AboutResponse> {
  const catalystUrl = await getCatalystBaseUrl(components)

  const map = generateParcelMap(sceneParcels)
  // save canvas to file
  const out = components.fs.createWriteStream('map.png')
  map.createPNGStream().pipe(out)

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
      realmName: 'SdkStaticExport',
      map: {
        minimapEnabled: false,
        sizes: getSizesByCoords(sceneParcels)
      }
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
