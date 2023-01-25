import { resolve } from 'path'

import { CliComponents } from '../../components'
import { toStringList } from '../../utils/out-messages'
import { succeed } from '../../utils/log'
import { getArgs } from '../../utils/args'
import { CliError } from '../../utils/error'
import {
  getProjectStructure,
  buildTypescript,
  installDependencies,
  needsDependencies,
  validateProjectStructure,
  validatePackageJson,
  REQUIRED_PACKAGE_JSON
} from './helpers'
import { main as handler } from '../../utils/handler'
import { info } from 'console'

interface Options {
  args: Omit<typeof args, '_'>
  components: Pick<CliComponents, 'fs'>
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
  Usage: 'dcl build [options]'
    Options:'
      -h, --help                Displays complete help
      -w, --watch               Watch for file changes and build on change
      -p, --production          Build without sourcemaps
      --skip-install            Skip installing dependencies
      --dir                     Path to directory to build

    Example:
    - Build your scene:
      '$ dcl build'
  `
}

export const main = handler(async function main(options: Options) {
  const dir = resolve(process.cwd(), options.args['--dir'] || '.')
  const projectStructure = getProjectStructure()

  const hasValidProjectStructure = await validateProjectStructure(
    dir,
    projectStructure
  )

  if (!hasValidProjectStructure) {
    throw new CliError(`Invalid scene structure found. Required files:
      ${toStringList(projectStructure)}`)
  }

  succeed('Project has a valid structure')

  const hasValidPackageJson = await validatePackageJson(
    dir,
    REQUIRED_PACKAGE_JSON
  )

  if (!hasValidPackageJson) {
    throw new CliError(`Invalid "package.json" file. Structure required:
      ${JSON.stringify(REQUIRED_PACKAGE_JSON, null, 2)}`)
  }

  succeed('Project has a valid "package.json"')

  const shouldInstallDeps = await needsDependencies(
    options.components,
    dir
  )

  if (shouldInstallDeps && !options.args['--skip-install']) {
    info('Installing dependencies...')
    await installDependencies(dir)
  }

  succeed('Dependencies installed')

  await buildTypescript({
    dir,
    watch: !!options.args['--watch'],
    production: !!options.args['--production']
  })

  succeed('Project built successfully!')

  // track stuff...
  // https://github.com/decentraland/cli/blob/main/src/commands/build.ts
})
