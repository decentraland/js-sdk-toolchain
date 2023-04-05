import path from 'path'
import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { installDependencies, needsDependencies, SceneProject } from '../../logic/project-validations'
import { getBaseCoords } from '../../logic/scene-validations'
import { b64HashingFunction } from '../../logic/project-files'
import { bundleProject } from '../../logic/bundle'
import { printCurrentProjectStarting } from '../../logic/beautiful-logs'
import { getValidWorkspace } from '../../logic/workspace-validations'
import { Result } from 'arg'

interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'fs' | 'logger' | 'analytics' | 'spawner'>
}

export const args = declareArgs({
  '--watch': Boolean,
  '-w': '--watch',
  '--production': Boolean,
  '--single': String,
  '--emitDeclaration': Boolean,
  '-p': '--production',
  '--skip-install': Boolean,
  '--dir': String
})

export function help(options: Options) {
  options.components.logger.log(`
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
  `)
}

export async function main(options: Options) {
  const workingDirectory = path.resolve(process.cwd(), options.args['--dir'] || '.')

  const workspace = await getValidWorkspace(options.components, workingDirectory)

  for (const project of workspace.projects) {
    printCurrentProjectStarting(options.components.logger, project, workspace)
    if (project.kind === 'scene') {
      await buildScene(options, project)
    }
  }
}

export async function buildScene(options: Options, project: SceneProject) {
  const shouldInstallDeps = await needsDependencies(options.components, project.workingDirectory)

  if (shouldInstallDeps && !options.args['--skip-install']) {
    await installDependencies(options.components, project.workingDirectory)
  }

  const watch = !!options.args['--watch']

  const { sceneJson } = await bundleProject(
    options.components,
    {
      workingDirectory: project.workingDirectory,
      watch,
      single: options.args['--single'],
      production: !!options.args['--production'],
      emitDeclaration: !!options.args['--emitDeclaration']
    },
    project.scene
  )

  const coords = getBaseCoords(sceneJson)

  options.components.analytics.track('Build scene', {
    projectHash: await b64HashingFunction(project.workingDirectory),
    coords,
    isWorkspace: false
  })
}
