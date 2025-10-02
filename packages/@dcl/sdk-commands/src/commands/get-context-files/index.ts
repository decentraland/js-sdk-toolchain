import path from 'path'
import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { assertValidProjectFolder } from '../../logic/project-validations'

import { Result } from 'arg'

// GitHub API endpoints
const GITHUB_API_BASE = 'https://api.github.com/repos/decentraland/documentation/contents/ai-sdk-context'
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/decentraland/documentation/main/ai-sdk-context'

interface GitHubFile {
  name: string
  path: string
  type: 'file' | 'dir'
  download_url?: string
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
      -h, --help                Displays complete help

    Example:
    - Get context files:
      $ sdk-commands get-context-files
  `)
}

async function listFilesFromPath(fetch: any, path: string = ''): Promise<GitHubFile[]> {
  const url = path ? `${GITHUB_API_BASE}/${path}` : GITHUB_API_BASE
  const response = await fetch.fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to list files from ${url}: ${response.statusText}`)
  }

  return await response.json()
}

async function downloadFile(fetch: any, url: string): Promise<string> {
  const response = await fetch.fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`)
  }
  return await response.text()
}

async function getAllFiles(fetch: any): Promise<Array<{ url: string; filename: string; path: string }>> {
  const files: Array<{ url: string; filename: string; path: string }> = []

  const rootFiles = await listFilesFromPath(fetch)

  for (const file of rootFiles) {
    if (file.type === 'file') {
      files.push({
        url: `${GITHUB_RAW_BASE}/${file.name}`,
        filename: file.name,
        path: file.name
      })
    } else if (file.type === 'dir') {
      const subFiles = await listFilesFromPath(fetch, file.name)
      for (const subFile of subFiles) {
        if (subFile.type === 'file') {
          files.push({
            url: `${GITHUB_RAW_BASE}/${file.name}/${subFile.name}`,
            filename: subFile.name,
            path: `${file.name}/${subFile.name}`
          })
        }
      }
    }
  }

  return files
}

async function addContextToDclIgnore(options: Options, targetDir: string): Promise<void> {
  const dclIgnorePath = path.join(targetDir, '.dclignore')
  
  try {
    const dclIgnoreContent = await options.components.fs.readFile(dclIgnorePath, 'utf8')
    const newContent = `${dclIgnoreContent}\ncontext\n`
    await options.components.fs.writeFile(dclIgnorePath, newContent, 'utf8')
    options.components.logger.log('✓ Added context to .dclignore')
  } catch (error) {
    options.components.logger.log('No .dclignore file found, skipping')
  }
}

export async function main(options: Options) {
  const targetDir = process.cwd()

  options.components.logger.log(`Working directory: ${targetDir}`)

  try {
    await assertValidProjectFolder(options.components, targetDir)
    options.components.logger.log('✓ Valid Scene project')
  } catch (error) {
    options.components.logger.log('Not a valid Scene...')
    return
  }

  const contextDir = path.join(targetDir, 'context')
  const contextExists = await options.components.fs.directoryExists(contextDir)

  if (!contextExists) {
    options.components.logger.log('Creating context directory...')
    await options.components.fs.mkdir(contextDir)
  }

  await addContextToDclIgnore(options, targetDir)

  options.components.logger.log(`Discovering context files...`)

  const filesToDownload = await getAllFiles(options.components.fetch)

  options.components.logger.log(`Found ${filesToDownload.length} files to download`)

  const downloadPromises = filesToDownload.map(async ({ url, filename, path: filePath }) => {
    try {
      options.components.logger.log(`Downloading ${filePath}...`)
      const content = await downloadFile(options.components.fetch, url)
      const localFilePath = path.join(contextDir, filename)
      await options.components.fs.writeFile(localFilePath, content)
      options.components.logger.log(`✓ Saved ${filePath}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      options.components.logger.log(`✗ Failed to download ${filePath}: ${errorMessage}`)
    }
  })

  await Promise.all(downloadPromises)

  options.components.logger.log(`\nDownload complete: ${filesToDownload.length} files processed`)
  options.components.logger.log(`Context files saved to: ${contextDir}`)
}
