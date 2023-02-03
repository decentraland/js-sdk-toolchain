import { resolve } from 'path'

import { CliComponents } from '../../components'
import { toStringList } from '../../utils/out-messages'
import { getArgs } from '../../utils/args'
import { CliError } from '../../utils/error'
import { compile } from '@dcl/dcl-rollup/compile'
import future from 'fp-future'
import {
  getProjectStructure,
  installDependencies,
  needsDependencies,
  validateProjectStructure,
  validatePackageJson,
  REQUIRED_PACKAGE_JSON
} from './helpers'

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
  Usage: 'dcl-commands build [options]'
    Options:'
      -h, --help                Displays complete help
      -w, --watch               Watch for file changes and build on change
      -p, --production          Build without sourcemaps
      --skip-install            Skip installing dependencies
      --dir                     Path to directory to build

    Example:
    - Build your scene:
      '$ dcl-commands build'
  `
}

export async function main(options: Options) {
  const dir = resolve(process.cwd(), options.args['--dir'] || '.')
  const projectStructure = getProjectStructure()

  const hasValidProjectStructure = await validateProjectStructure(options.components, dir, projectStructure)

  if (!hasValidProjectStructure) {
    throw new CliError(`Invalid scene structure found. Required files:
      ${toStringList(projectStructure)}`)
  }

  const hasValidPackageJson = await validatePackageJson(options.components, dir, REQUIRED_PACKAGE_JSON)

  if (!hasValidPackageJson) {
    throw new CliError(`Invalid "package.json" file. Structure required:
      ${JSON.stringify(REQUIRED_PACKAGE_JSON, null, 2)}`)
  }

  const shouldInstallDeps = await needsDependencies(options.components, dir)

  if (shouldInstallDeps && !options.args['--skip-install']) {
    await installDependencies(dir)
  }

  const watch = !!options.args['--watch']

  const watchingFuture = future<any>()

  await compile({
    project: dir,
    watch,
    production: !!options.args['--production'],
    watchingFuture
  })

  if (!watch) {
    watchingFuture.resolve(null)
  }

  await watchingFuture

  // track stuff...
  // https://github.com/decentraland/cli/blob/main/src/commands/build.ts

  // rollup watcher leaves many open FSWatcher even in build mode. we must call
  // process.exit at this point to prevent the program halting forever
  process.exit(process.exitCode)
}
