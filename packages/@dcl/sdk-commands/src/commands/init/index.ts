import path from 'path'
import i18next from 'i18next'

import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { CliError } from '../../logic/error'
import { download, extract, isDirectoryEmpty } from '../../logic/fs'

import { Result } from 'arg'
import { installDependencies, needsDependencies } from '../../logic/project-validations'
import { ScaffoldedProject, existScaffoldedProject, getScaffoldedProjectUrl, scaffoldedProjectOptions } from './repos'
import { createPxSceneJson } from './project'
import { downloadGithubFolder } from './download-github-folder'

export interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'fetch' | 'fs' | 'logger' | 'analytics' | 'spawner'>
}

export const args = declareArgs({
  '--yes': Boolean,
  '-y': '--yes',
  '--dir': String,
  '--skip-install': Boolean,
  '--template': String,
  '--project': String,
  '--github-repo': String
})

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands init [options]'
    Options:'
      -h, --help                Displays complete help
      -y, --yes                 Override empty directory check
      --dir                     Path to directory to init
      --skip-install            Skip installing dependencies
      --template                URL to template to init
      --github-repo             URL to github repository
      --project                 Project to init (opts: ${scaffoldedProjectOptions().join(', ')})

    Example:
    - Init your scene:
      '$ sdk-commands init'
  `)
}

export async function main(options: Options) {
  const dir = path.resolve(process.cwd(), options.args['--dir'] || '.')
  const isEmpty = await isDirectoryEmpty(options.components, dir)
  const yes = options.args['--yes']
  const requestedTemplateZipUrl = options.args['--template']
  const requestedProjectTemplate = options.args['--project']
  const githubRepo = options.args['--github-repo']

  if (!isEmpty && !yes) {
    throw new CliError('INIT_DIR_NOT_EMPTY', i18next.t('errors.init.dir_not_empty'))
  }

  if (requestedTemplateZipUrl && requestedProjectTemplate) {
    throw new CliError('INIT_INVALID_ARGUMENTS', i18next.t('errors.init.invalid_arguments'))
  }

  if (requestedProjectTemplate && !existScaffoldedProject(requestedProjectTemplate)) {
    throw new CliError(
      'INIT_INVALID_PROJECT',
      i18next.t('errors.init.invalid_project', { options: scaffoldedProjectOptions().join(', ') })
    )
  }

  // download and extract template project
  const projectTemplate = (requestedProjectTemplate as ScaffoldedProject) || 'scene-template'
  const url = githubRepo || requestedTemplateZipUrl || getScaffoldedProjectUrl(projectTemplate)

  if (githubRepo) {
    await downloadGithubFolder(options.components, githubRepo, dir)
  } else {
    await downloadAndUnzipUrlContainFolder(url, dir, options)
    // replace scene.json for portable experience template...
    if (projectTemplate === 'px-template') await createPxSceneJson(dir, options.components.fs)
  }

  // npm install
  const shouldInstallDeps = await needsDependencies(options.components, dir)
  if (shouldInstallDeps && !options.args['--skip-install']) {
    await installDependencies(options.components, dir)
  }
  options.components.analytics.track('Scene created', {
    projectType: githubRepo ? 'github-repo' : requestedTemplateZipUrl ? 'custom-template-url' : projectTemplate,
    url
  })
}

export async function downloadAndUnzipUrlContainFolder(url: string, dest: string, options: Options) {
  const zipFilePath = path.resolve(dest, 'temp-zip-project.zip')
  const zip = await download(options.components, url, zipFilePath)

  const zipExtracted = await extract(zip, dest)
  if (zipExtracted.topLevelFolders.length !== 1) {
    throw new CliError('INIT_INVALID_TEMPLATE_ZIP_URL', i18next.t('errors.init.invalid_template_zip_url'))
  }

  const extractedPath = path.resolve(dest, zipExtracted.topLevelFolders[0])
  const filesToMove = await options.components.fs.readdir(extractedPath)

  for (const filePath of filesToMove) {
    await options.components.fs.rename(path.resolve(extractedPath, filePath), path.resolve(dest, filePath))
  }

  await options.components.fs.rmdir(extractedPath)
  await options.components.fs.unlink(zipFilePath)
}
