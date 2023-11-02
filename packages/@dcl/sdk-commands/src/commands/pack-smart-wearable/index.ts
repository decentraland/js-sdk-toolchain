import path from 'path'
import archiver from 'archiver'

import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { installDependencies, needsDependencies, WearableProject } from '../../logic/project-validations'
import { b64HashingFunction, getProjectPublishableFilesWithHashes } from '../../logic/project-files'
import { printCurrentProjectStarting } from '../../logic/beautiful-logs'
import { getValidWorkspace } from '../../logic/workspace-validations'
import { Result } from 'arg'
import { buildScene } from '../build'

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

  try {
    await zipProject(
      options.components.fs,
      files.map(($) => $.absolutePath.replace(project.workingDirectory + path.sep, '')),
      packDir
    )
  } catch (e) {
    options.components.logger.error('Error creating zip file', (e as any).message)
  }

  options.components.analytics.track('Pack smart wearable', {
    projectHash: await b64HashingFunction(project.workingDirectory)
  })
  options.components.logger.log('Smart wearable packed successfully.')
}

function zipProject(fs: CliComponents['fs'], files: string[], target: string) {
  const output = fs.createWriteStream(target)
  const archive = archiver('zip')

  return new Promise<void>((resolve, reject) => {
    output.on('close', () => {
      resolve()
    })

    archive.on('warning', (err) => {
      reject(err)
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)

    for (const file of files) {
      if (file === '') continue
      archive.file(file, { name: file })
    }

    return archive.finalize()
  })
}
