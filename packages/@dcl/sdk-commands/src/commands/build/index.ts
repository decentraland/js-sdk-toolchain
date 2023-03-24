import { resolve } from 'path'
import { CliComponents } from '../../components'
import { getArgs, getArgsUsed } from '../../logic/args'
import { assertValidProjectFolder, installDependencies, needsDependencies } from '../../logic/project-validations'
import { getBaseCoords } from '../../logic/scene-validations'
import { b64HashingFunction } from '../../logic/project-files'
import { bundleProject } from '../../logic/bundle'

interface Options {
  args: typeof args
  components: Pick<CliComponents, 'fs' | 'logger' | 'dclInfoConfig' | 'analytics' | 'spawner'>
}

export const args = getArgs({
  '--watch': Boolean,
  '-w': '--watch',
  '--production': Boolean,
  '--single': String,
  '--emitDeclaration': Boolean,
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
  const workingDirectory = resolve(process.cwd(), options.args['--dir'] || '.')
  await assertValidProjectFolder(options.components, workingDirectory)

  const shouldInstallDeps = await needsDependencies(options.components, workingDirectory)

  if (shouldInstallDeps && !options.args['--skip-install']) {
    await installDependencies(options.components, workingDirectory)
  }

  const watch = !!options.args['--watch']

  const { sceneJson } = await bundleProject(options.components, {
    workingDirectory,
    watch,
    single: options.args['--single'],
    production: !!options.args['--production'],
    emitDeclaration: !!options.args['--emitDeclaration']
  })

  const coords = getBaseCoords(sceneJson)

  options.components.analytics.trackSync('Build scene', {
    projectHash: await b64HashingFunction(workingDirectory),
    coords,
    isWorkspace: false,
    args: getArgsUsed(options.args)
  })

  if (watch) {
    await new Promise(() => void 0)
  }
}
