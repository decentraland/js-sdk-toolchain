import { AssetPack } from '../../logic/catalog'
import { LoadableScene } from '../../babylon/decentraland/SceneContext'

// this was taken verbatim from my deployed world at menduz.dcl.eth
export function getHardcodedLoadableScene(_id: string, catalog: AssetPack[]): LoadableScene {
  return {
    baseUrl: 'https://builder-items.decentraland.org/contents/',
    id: 'urn:decentraland:entity:bafkreid44xhavttoz4nznidmyj3rjnrgdza7v6l7kd46xdmleor5lmsxfm',
    entity: {
      version: 'v3',
      type: 'scene' as any,
      pointers: ['0,0', '0,1'],
      timestamp: 1665777069759,
      content: catalog
        .map((assetPack) =>
          assetPack.assets
            .map((asset) => Object.keys(asset.contents).map((file) => ({ file, hash: asset.contents[file] })))
            .reduce((assetPackContents, assetContents) => assetPackContents.concat(assetContents), [])
        )
        .reduce((allContents, assetPackContents) => allContents.concat(assetPackContents), []),
      metadata: {
        display: {
          title: 'DCL Scene',
          description: 'My new Decentraland project',
          navmapThumbnail: 'images/scene-thumbnail.png',
          favicon: 'favicon_asset'
        },
        owner: '',
        contact: { name: 'wacaine', email: '' },
        main: 'bin/game.js',
        tags: [],
        scene: { parcels: ['0,0', '0,1'], base: '0,0' },
        spawnPoints: [
          { name: 'spawn1', default: true, position: { x: 0, y: 0, z: 0 }, cameraTarget: { x: 8, y: 1, z: 8 } }
        ],
        requiredPermissions: [],
        featureToggles: {}
      }
    }
  }
}
