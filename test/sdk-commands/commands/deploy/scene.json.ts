export const sceneJson = {
  ecs7: true,
  runtimeVersion: '7',
  display: {
    title: 'SDK7 Decentraland - Cube Spawner Scene',
    description: 'First scene with SDK7',
    navmapThumbnail: 'images/scene-thumbnail.png',
    favicon: 'favicon_asset'
  },
  owner: '',
  contact: {
    name: 'SDK',
    email: ''
  },
  main: 'bin/index.js',
  tags: [],
  scene: {
    parcels: ['0,0'],
    base: '0,0'
  },
  spawnPoints: [
    {
      name: 'spawn1',
      default: true,
      position: {
        x: [0, 3],
        y: [0, 0],
        z: [0, 3]
      },
      cameraTarget: {
        x: 8,
        y: 1,
        z: 8
      }
    }
  ],
  requiredPermissions: ['ALLOW_TO_TRIGGER_AVATAR_EMOTE', 'ALLOW_TO_MOVE_PLAYER_INSIDE_SCENE'],
  featureToggles: {}
}
