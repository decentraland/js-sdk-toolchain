import path from 'path'
import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { assertValidProjectFolder } from '../../logic/project-validations'
import { CliError } from '../../logic/error'
import i18next from 'i18next'

import { Result } from 'arg'
const GITHUB_API_BASE = 'https://api.github.com/repos/decentraland/documentation/contents/ai-sdk-context'
interface GitHubFile {
  name: string
  path: string
  type: 'file' | 'dir'
  download_url?: string
  url: string
}

export interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'logger' | 'fs' | 'fetch'>
}

export const args = declareArgs({
  '--help': Boolean,
  '-h': '--help'
})

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands get-context-files [options]'
    Options:
      -h, --help                Gets & updates context files from https://github.com/decentraland/documentation/tree/main/ai-sdk-context only on valid scenes

    Example:
    - Get context files:
      $ sdk-commands get-context-files
  `)
}

async function listFilesFromPath(components: Pick<CliComponents, 'fetch'>, url: string): Promise<GitHubFile[]> {
  const response = await components.fetch.fetch(url)

  if (!response.ok) {
    throw new CliError('GET_CONTEXT_FILES_LIST_FAILED', i18next.t('errors.get_context_files.list_failed'))
  }

  return (await response.json()) as GitHubFile[]
}

async function downloadFile(components: Pick<CliComponents, 'fetch'>, url: string): Promise<string> {
  const response = await components.fetch.fetch(url)
  if (!response.ok) {
    throw new CliError('GET_CONTEXT_FILES_DOWNLOAD_FAILED', i18next.t('errors.get_context_files.download_failed'))
  }
  return await response.text()
}

async function getAllFiles(
  components: Pick<CliComponents, 'fetch'>,
  initialUrl: string = GITHUB_API_BASE
): Promise<Array<{ url: string; filename: string; path: string }>> {
  const files: Array<{ url: string; filename: string; path: string }> = []
  const rootFiles = await listFilesFromPath(components, initialUrl)
  for (const file of rootFiles) {
    if (file.type === 'file') {
      if (file.download_url) {
        const filename = file.name
        const fileInfo = {
          url: file.download_url,
          filename: filename,
          path: file.path
        }
        files.push(fileInfo)
      }
    } else if (file.type === 'dir') {
      const subFiles = await getAllFiles(components, file.url)
      files.push(...subFiles)
    }
  }

  return files
}

export async function main(options: Options) {
  const targetDir = process.cwd()
  try {
    await assertValidProjectFolder(options.components, targetDir)
    options.components.logger.log('✓ Valid Scene project')
  } catch (error) {
    options.components.logger.log('Not a valid Scene...')
    return
  }

  const contextDir = path.join(targetDir, 'dclcontext')
  const contextExists = await options.components.fs.directoryExists(contextDir)

  if (contextExists) {
    options.components.logger.log('Context directory exists. Removing old files...')
    await options.components.fs.rm(contextDir, { recursive: true })
  }

  options.components.logger.log('Creating context directory...')
  await options.components.fs.mkdir(contextDir)

  const filesToDownload = await getAllFiles(options.components, GITHUB_API_BASE)
  const successfulDownloads: string[] = []
  const failedDownloads: Array<{ filePath: string; error: string }> = []

  const downloadPromises = filesToDownload.map(async ({ url, filename, path: filePath }) => {
    try {
      const content = await downloadFile(options.components, url)
      const localFilePath = path.join(contextDir, filename)
      await options.components.fs.writeFile(localFilePath, content)
      options.components.logger.log(`✓ Saved ${filePath}`)
      successfulDownloads.push(filePath)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      options.components.logger.log(`✗ Failed to download ${filePath}: ${errorMessage}`)
      failedDownloads.push({ filePath, error: errorMessage })
    }
  })

  await Promise.all(downloadPromises)

  options.components.logger.log(
    `\nDownload complete: ${successfulDownloads.length} successful, ${failedDownloads.length} failed`
  )
  if (successfulDownloads.length > 0) {
    options.components.logger.log(`Successfully downloaded:`)
    successfulDownloads.forEach((filePath) => {
      options.components.logger.log(`  ✓ ${filePath}`)
    })
  }

  if (failedDownloads.length > 0) {
    options.components.logger.log(`Failed downloads:`)
    failedDownloads.forEach(({ filePath, error }) => {
      options.components.logger.log(`  ✗ ${filePath}: ${error}`)
    })
  }
}
