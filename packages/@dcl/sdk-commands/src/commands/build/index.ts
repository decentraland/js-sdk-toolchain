import { resolve } from 'path'
import { CliComponents } from '../../components'
import { getArgs } from '../../logic/args'
import { compile } from '@dcl/dcl-rollup/compile'
import future from 'fp-future'
import { assertValidProjectFolder, installDependencies, needsDependencies } from '../../logic/project-validations'
import { track } from '../../logic/analytics'
import { b64HashingFunction } from '../start/server/endpoints'
import { getBaseCoords } from '../../logic/scene-validations'
import { getSceneJson } from '../../logic/project-files'

interface Options {
  args: Omit<typeof args, '_'>
  components: Pick<CliComponents, 'fs' | 'logger'>
}

export const args = getArgs({
  '--watch': Boolean,
  '-w': '--watch',
  '--production': Boolean,
  '-p': '--production',
  '--skip-install': Boolean,
  '--dir': String
})

export function help() {
  return `
  Usage: 'sdk-commands build [options]'
    Options:'
      -h, --help                Displays complete help
      -w, --watch               Watch for file changes and build on change
      -p, --production          Build without sourcemaps
      --skip-install            Skip installing dependencies
      --dir                     Path to directory to build

    Example:
    - Build your scene:
      '$ sdk-commands build'
  `
}

export async function main(options: Options) {
  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')
  await assertValidProjectFolder(options.components, projectRoot)

  const shouldInstallDeps = await needsDependencies(options.components, projectRoot)

  if (shouldInstallDeps && !options.args['--skip-install']) {
    await installDependencies(options.components, projectRoot)
  }

  const watch = !!options.args['--watch']

  const watchingFuture = future<any>()

  await compile({
    project: projectRoot,
    watch,
    production: !!options.args['--production'],
    watchingFuture
  })

  if (!watch) {
    watchingFuture.resolve(null)
  }
  const sceneJson = await getSceneJson(options.components, projectRoot)
  const coords = getBaseCoords(sceneJson)

  await track(options.components, 'Build scene', {
    projectHash: await b64HashingFunction(projectRoot),
    coords,
    isWorkspace: false
  })

  await watchingFuture

  // track stuff...
  // https://github.com/decentraland/cli/blob/main/src/commands/build.ts
}
