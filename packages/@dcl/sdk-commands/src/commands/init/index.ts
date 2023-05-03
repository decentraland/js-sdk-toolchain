import path from 'path'

import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { CliError } from '../../logic/error'
import { download, extract, isDirectoryEmpty } from '../../logic/fs'

import { Result } from 'arg'
import { installDependencies, needsDependencies } from '../../logic/project-validations'
import { ScaffoldedProject, existScaffoldedProject, getScaffoldedProjectUrl, scaffoldedProjectOptions } from './repos'

interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'fetch' | 'fs' | 'logger' | 'analytics' | 'spawner'>
}

export const args = declareArgs({
  '--yes': Boolean,
  '-y': '--yes',
  '--dir': String,
  '--skip-install': Boolean,
  '--template': String,
  '--project': String
})

export async function help() {}

export async function main(options: Options) {
  const dir = path.resolve(process.cwd(), options.args['--dir'] || '.')
  const isEmpty = await isDirectoryEmpty(options.components, dir)
  const yes = options.args['--yes']
  const requestedTemplateZipUrl = options.args['--template']
  const requestedProjectTemplate = options.args['--project']

  if (!isEmpty && !yes) {
    throw new CliError('The target directory specified is not empty. Run this command with --yes to override.')
  }

  if (requestedTemplateZipUrl && requestedProjectTemplate) {
    throw new CliError(
      `Specifying --template and --project at the same time is not allowed. Please specify only one of them.`
    )
  }

  if (requestedProjectTemplate && !existScaffoldedProject(requestedProjectTemplate)) {
    throw new CliError(
      `The requested scene doesn't exist empty. Valid options are: ${scaffoldedProjectOptions().join(', ')}`
    )
  }

  // download and extract template project
  const projectTemplate = (requestedProjectTemplate as ScaffoldedProject) || 'scene-template'
  const url = requestedTemplateZipUrl || getScaffoldedProjectUrl(projectTemplate)
  await downloadAndUnzipUrl(url, dir, options)

  // npm install
  const shouldInstallDeps = await needsDependencies(options.components, dir)
  if (shouldInstallDeps && !options.args['--skip-install']) {
    await installDependencies(options.components, dir)
  }
  options.components.analytics.track('Scene created', {
    projectType: requestedTemplateZipUrl ? 'custom-template-url' : projectTemplate,
    url
  })
}

export async function downloadAndUnzipUrl(url: string, dest: string, options: Options) {
  const zipFilePath = path.resolve(dest, 'temp-zip-project.zip')
  const zip = await download(options.components, url, zipFilePath)

  const oldFiles = await options.components.fs.readdir(dest)

  try {
    await extract(zip, dest)
  } catch (err) {
    options.components.logger.log(`Couldn't extract the zip of the repository.`)
    throw err
  }

  const newFiles = await options.components.fs.readdir(dest)

  const directoryCreated = newFiles.filter((value) => !oldFiles.includes(value))

  if (directoryCreated.length !== 1) {
    throw new Error('Please, make sure not to modify the directory while the example repository is downloading.')
  }

  const extractedPath = path.resolve(dest, directoryCreated[0])
  const filesToMove = await options.components.fs.readdir(extractedPath)

  for (const filePath of filesToMove) {
    await options.components.fs.rename(path.resolve(extractedPath, filePath), path.resolve(dest, filePath))
  }

  await options.components.fs.rm(extractedPath)
  await options.components.fs.rm(zipFilePath)
}
