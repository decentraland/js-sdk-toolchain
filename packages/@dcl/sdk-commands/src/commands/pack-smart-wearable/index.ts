import path from 'path'
import archiver from 'archiver'
import i18next from 'i18next'

import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { installDependencies, needsDependencies, WearableProject } from '../../logic/project-validations'
import { b64HashingFunction, getProjectPublishableFilesWithHashes } from '../../logic/project-files'
import { printCurrentProjectStarting } from '../../logic/beautiful-logs'
import { getValidWorkspace } from '../../logic/workspace-validations'
import { Result } from 'arg'
import { buildScene } from '../build'
import { CliError } from '../../logic/error'

interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'fs' | 'logger' | 'analytics' | 'spawner'>
}

export const args = declareArgs({
  '--skip-build': Boolean,
  '--skip-install': Boolean,
  '--dir': String
})

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands pack-smart-wearable [options]'
    Options:'
      -h, --help                Displays complete help
      --skip-build              Skip build and use the file defined in scene.json
      --skip-install            Skip installing dependencies
      --dir                     Path to directory to build

    Example:
    - Pack your smart-wearable scene:
      '$ sdk-commands pack-smart-wearable'
  `)
}

export async function main(options: Options) {
  const workingDirectory = path.resolve(process.cwd(), options.args['--dir'] || '.')

  const workspace = await getValidWorkspace(options.components, workingDirectory)

  for (const project of workspace.projects) {
    printCurrentProjectStarting(options.components.logger, project, workspace)
    if (project.kind === 'smart-wearable') {
      await packSmartWearable(options, project)
    }
  }
}

export async function packSmartWearable(options: Options, project: WearableProject) {
  const shouldInstallDeps =
    !options.args['--skip-install'] && (await needsDependencies(options.components, project.workingDirectory))
  const shouldBuild = !options.args['--skip-build']

  if (shouldInstallDeps && !options.args['--skip-install']) {
    await installDependencies(options.components, project.workingDirectory)
  }

  if (shouldBuild) {
    await buildScene({ ...options, args: { '--dir': project.workingDirectory, _: [], '--production': true } }, project)
  }

  const files = await getProjectPublishableFilesWithHashes(options.components, project.workingDirectory, async ($) => $)
  let totalSize = 0
  for (const filePath of files) {
    const stat = await options.components.fs.stat(filePath.absolutePath)
    if (stat.isFile()) {
      totalSize += stat.size
    }
  }
  const MAX_WEARABLE_SIZE = 2097152
  if (totalSize > MAX_WEARABLE_SIZE) {
    options.components.logger.info(`Smart Wearable max size (${MAX_WEARABLE_SIZE} bytes) reached: ${totalSize} bytes.
Please try to remove unneccessary files and/or reduce the files size, you can ignore file adding in .dclignore.`)
  }
  const ZIP_FILE_NAME = 'smart-wearable.zip'
  const packDir = path.resolve(project.workingDirectory, ZIP_FILE_NAME)
  if (await options.components.fs.fileExists(packDir)) {
    await options.components.fs.rm(packDir)
  }
  options.components.logger.info(packDir)

  // File discovery follows symlinks, so a link inside the project can point at anything
  // this user can read and would be archived under a harmless-looking entry name. Compare
  // the resolved paths against the resolved project root and refuse rather than silently
  // shipping someone else's file inside the wearable.
  const projectRoot = await options.components.fs.realpath(project.workingDirectory)
  const escaping: string[] = []
  for (const file of files) {
    const realPath = await options.components.fs.realpath(file.absolutePath).catch(() => file.absolutePath)
    const relative = path.relative(projectRoot, realPath)
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
      escaping.push(path.relative(project.workingDirectory, file.absolutePath))
    }
  }
  if (escaping.length > 0) {
    throw new CliError(
      'PACK_SMART_WEARABLE_ESCAPES_PROJECT',
      i18next.t('errors.pack_smart_wearable.escapes_project', { files: escaping.join(', ') })
    )
  }

  try {
    await zipProject(
      options.components.fs,
      files.map(($) => ({
        absolutePath: $.absolutePath,
        // Zip entries are posix paths regardless of the host.
        name: path.relative(project.workingDirectory, $.absolutePath).split(path.sep).join('/')
      })),
      packDir
    )
  } catch (e) {
    // A rejection is not guaranteed to carry an Error: a dependency can reject with a
    // string or a plain object, and reading `.message` off that reported "undefined".
    throw new CliError(
      'PACK_SMART_WEARABLE_ZIP_FAILED',
      i18next.t('errors.pack_smart_wearable.zip_failed', { error: e instanceof Error ? e.message : String(e) })
    )
  }

  options.components.analytics.track('Pack smart wearable', {
    projectHash: await b64HashingFunction(project.workingDirectory)
  })
  options.components.logger.log('Smart wearable packed successfully.')
}

type FileToZip = { absolutePath: string; name: string }

function zipProject(fs: CliComponents['fs'], files: FileToZip[], target: string) {
  const output = fs.createWriteStream(target)
  const archive = archiver('zip')

  return new Promise<void>((resolve, reject) => {
    output.on('close', () => {
      resolve()
    })

    // Most write failures reach us here rather than through `archive`: a full disk, a
    // read-only or missing directory, a revoked permission. Without this the command
    // either reported success on a zip that was never written or hung, because
    // 'close' never arrives on a stream that failed.
    output.on('error', (err) => {
      reject(err)
    })

    archive.on('warning', (err) => {
      reject(err)
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)

    for (const file of files) {
      if (file.name === '') continue
      // archiver resolves a relative source against process.cwd(), which is not
      // the project unless the command happens to be run from inside it.
      archive.file(file.absolutePath, { name: file.name })
    }

    return archive.finalize()
  })
}
