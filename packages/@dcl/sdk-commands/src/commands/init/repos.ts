type Scene = 'scene-template'

type Repos = {
  [key in Scene]: {
    url: string
    contentFolders: string[]
  }
}

const REPOS: Repos = {
  'scene-template': {
    url: 'https://github.com/decentraland/sdk7-scene-template/archive/refs/heads/main.zip',
    contentFolders: ['sdk7-scene-template-main']
  }
}

export const get = (scene: Scene): Repos[Scene] => REPOS[scene]
