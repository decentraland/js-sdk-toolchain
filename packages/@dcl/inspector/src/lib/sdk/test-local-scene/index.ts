import { ITheme } from '../../../components/AssetsCatalog/types'
import { LoadableScene } from '../../babylon/decentraland/SceneContext'

// this was taken verbatim from my deployed world at menduz.dcl.eth
export function getHardcodedLoadableScene(_id: string, catalog: ITheme[]): LoadableScene {
  return {
    baseUrl: 'https://worlds-content-server.decentraland.org/ipfs/',
    id: 'urn:decentraland:entity:bafkreid44xhavttoz4nznidmyj3rjnrgdza7v6l7kd46xdmleor5lmsxfm',
    entity: {
      version: 'v3',
      type: 'scene' as any,
      pointers: ['0,0', '0,1'],
      timestamp: 1665777069759,
      content: [
        {
          file: 'bin/game.js',
          hash: 'bafkreibyndfz2k2vw7qegxgdhcqb5vlyepcszycpk445snt4cxfqpsvasu'
        },
        {
          file: 'bin/game.js.map',
          hash: 'bafybeigh74j7s6jkl4gwilwu6ftlb2qrhliy4an5l3cxsma6dkg4rp4lse'
        },
        {
          file: 'models/Fish_01.glb',
          hash: 'bafkreigllbmvlnhgdbal5w23rzpvdgpfgw5izytvygc2jz7api7d45xrdy'
        },
        {
          file: 'models/Fish_03.glb',
          hash: 'bafkreichq7bpfxz53kxi2a7vs7goj4nd6mwmg6ov6oh5pcueqyid6j4cwi'
        },
        {
          file: 'models/Fish_04.glb',
          hash: 'bafkreian3us5uykagt57wehzoutjfom2jctj2hsee6eulr36m7dnctmpqa'
        },
        {
          file: 'models/Image_0.png',
          hash: 'bafkreih5kqir5ykts43262cxm755la4s3pjfel7wf5gqacsj4tdpferevi'
        },
        {
          file: 'models/PiratesPack_TX.png.png',
          hash: 'bafkreibtlcu5xu4u7qloyhi6s36e722qu7y7ths2xaspwqgqynpnl5aukq'
        },
        {
          file: 'models/Underwater_floor.glb',
          hash: 'bafybeicyrwyoet7lhcpjedfq3taitm5e2ap6j6nqc3mkgwmbylrlu3qp5y'
        },
        {
          file: 'models/shark.glb',
          hash: 'bafkreigwbedamc5bfsqawkllabrccaftw6hjzxugu7jk4ey2krrnvgjrhy'
        },
        {
          file: 'scene.json',
          hash: 'bafkreievaypmaxhrsg3bts4gjs6fcyrrsltkkuxxcqmuor2sw3og6i7up4'
        }
      ],
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
