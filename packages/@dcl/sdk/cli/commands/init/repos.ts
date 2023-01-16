export const REPOS = {
  'scene-template':
    'https://github.com/decentraland/sdk7-scene-template/archive/refs/heads/main.zip'
}

export const get = (repo: keyof typeof REPOS) => REPOS[repo]
