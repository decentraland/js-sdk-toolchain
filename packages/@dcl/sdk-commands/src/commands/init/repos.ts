export type ScaffoldedProject = 'scene-template' | 'px-template' | 'smart-wearable' | 'library'

const scaffoldedProjectUrls: Record<ScaffoldedProject, string> = {
  'scene-template': 'https://github.com/decentraland/sdk7-scene-template/archive/refs/heads/main.zip',
  'px-template': 'https://github.com/decentraland/sdk7-scene-template/archive/refs/heads/main.zip',
  'smart-wearable': 'https://github.com/decentraland/smart-wearable-sample/archive/refs/heads/sdk7.zip',
  library: 'https://github.com/decentraland/sdk7-library-template/archive/refs/heads/main.zip'
}

export function getScaffoldedProjectUrl(scene: ScaffoldedProject): string {
  return scaffoldedProjectUrls[scene]
}

export function existScaffoldedProject(maybeProject: string): boolean {
  return maybeProject in scaffoldedProjectUrls
}

export function scaffoldedProjectOptions(): ScaffoldedProject[] {
  return Object.keys(scaffoldedProjectUrls) as ScaffoldedProject[]
}
