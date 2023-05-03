export type ScaffoldedScene = 'scene-template' | 'editor-scene-template'

type Repos = {
  [key in ScaffoldedScene]: {
    url: string
    contentFolders: string[]
  }
}

const REPOS: Repos = {
  'scene-template': {
    url: 'https://github.com/decentraland/sdk7-scene-template/archive/refs/heads/main.zip',
    contentFolders: ['sdk7-scene-template-main']
  },
  'editor-scene-template': {
    url: 'https://github.com/decentraland/editor-sdk7-scene-template/archive/refs/heads/main.zip',
    contentFolders: ['editor-sdk7-scene-template-main']
  }
}

export function getScaffoldedSceneRepo(scene: ScaffoldedScene): Repos[ScaffoldedScene] {
  return REPOS[scene]
}

export function existScaffoldedScene(maybeScene: string): boolean {
  return maybeScene in REPOS
}

export function scaffoldedSceneOptions(): ScaffoldedScene[] {
  return Object.keys(REPOS) as ScaffoldedScene[]
}
