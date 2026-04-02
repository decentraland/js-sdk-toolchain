import path from 'path'
import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { assertValidProjectFolder } from '../../logic/project-validations'
import { CliError } from '../../logic/error'
import { ensureDclIgnoreEntries } from '../../logic/dcl-ignore'
import i18next from 'i18next'

import { Result } from 'arg'
const GITHUB_API_BASE = 'https://api.github.com/repos/decentraland/docs/contents/ai-sdk-context'
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
      -h, --help                Gets & updates context files from https://github.com/decentraland/docs/tree/main/ai-sdk-context only on valid scenes

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

/**
 * Recursively lists all files from the GitHub Contents API, preserving relative paths
 * from the base URL directory.
 */
async function getAllFiles(
  components: Pick<CliComponents, 'fetch'>,
  initialUrl: string = GITHUB_API_BASE,
  basePath: string = ''
): Promise<Array<{ url: string; relativePath: string }>> {
  const files: Array<{ url: string; relativePath: string }> = []
  const entries = await listFilesFromPath(components, initialUrl)
  for (const entry of entries) {
    const entryRelativePath = basePath ? `${basePath}/${entry.name}` : entry.name
    if (entry.type === 'file') {
      if (entry.download_url) {
        files.push({
          url: entry.download_url,
          relativePath: entryRelativePath
        })
      }
    } else if (entry.type === 'dir') {
      const subFiles = await getAllFiles(components, entry.url, entryRelativePath)
      files.push(...subFiles)
    }
  }

  return files
}

/**
 * Scans `dclcontext/skills/` for subdirectories containing a SKILL.md file.
 * Returns a list of { name, relativePath } for each skill found.
 */
async function discoverSkills(
  components: Pick<CliComponents, 'fs'>,
  contextDir: string
): Promise<Array<{ name: string; relativePath: string }>> {
  const skills: Array<{ name: string; relativePath: string }> = []
  const skillsDir = path.join(contextDir, 'skills')
  const skillsDirExists = await components.fs.directoryExists(skillsDir)
  if (!skillsDirExists) return skills

  const entries = await components.fs.readdir(skillsDir)
  for (const entry of entries) {
    const entryPath = path.join(skillsDir, entry)
    const isDir = await components.fs.directoryExists(entryPath)
    if (isDir) {
      const skillFile = path.join(entryPath, 'SKILL.md')
      const skillExists = await components.fs.fileExists(skillFile)
      if (skillExists) {
        // Convert folder name to a readable label: "add-3d-models" -> "Add 3d Models"
        const label = entry
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        skills.push({
          name: label,
          relativePath: `dclcontext/skills/${entry}/SKILL.md`
        })
      }
    }
  }

  return skills
}

/**
 * Generates CLAUDE.md at the scene root with links to discovered skills.
 * Only creates the file if it does not already exist.
 */
async function generateClaudeMd(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  targetDir: string,
  skills: Array<{ name: string; relativePath: string }>
): Promise<void> {
  const claudePath = path.join(targetDir, 'CLAUDE.md')
  const exists = await components.fs.fileExists(claudePath)
  if (exists) {
    components.logger.log('[AI-Context] CLAUDE.md already exists, skipping')
    return
  }

  let content = `# Decentraland SDK7 Scene\n`

  if (skills.length > 0) {
    content += `\n## Skills\n\n`
    content += `When a task matches a skill's domain, read the corresponding SKILL.md before implementing:\n\n`
    for (const skill of skills) {
      content += `- [${skill.name}](${skill.relativePath})\n`
    }
  }

  content += `\n## Reference\n\n`
  content += `Context files live in \`dclcontext/\`. Use them as your reference for all SDK7 development.\n`
  content += `Always prefer patterns found in these files over general web knowledge about Decentraland SDK7.\n`

  await components.fs.writeFile(claudePath, content)
  components.logger.log('✓ Generated CLAUDE.md')
}

/**
 * Generates .cursorrules at the scene root pointing Cursor to dclcontext/.
 * Only creates the file if it does not already exist.
 */
async function generateCursorRules(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  targetDir: string,
  skills: Array<{ name: string; relativePath: string }>
): Promise<void> {
  const cursorRulesPath = path.join(targetDir, '.cursorrules')
  const exists = await components.fs.fileExists(cursorRulesPath)
  if (exists) {
    components.logger.log('[AI-Context] .cursorrules already exists, skipping')
    return
  }

  let content = `# Decentraland SDK7 — AI Context\n\n`
  content += `When working on this Decentraland scene, use the context files in \`dclcontext/\` as your\n`
  content += `reference for all SDK7 development.\n\n`
  content += `Reference docs:\n`
  content += `- \`dclcontext/overview/\` — SDK7 API reference\n`
  content += `- \`dclcontext/context/\` — cheat sheets and shared context\n`
  content += `- \`dclcontext/libraries/\` — library-specific docs\n`

  if (skills.length > 0) {
    content += `\nSkills (read the SKILL.md when a task matches):\n`
    for (const skill of skills) {
      content += `- \`${skill.relativePath}\`\n`
    }
  }

  content += `\nAlways prefer patterns found in these files over general web knowledge about Decentraland SDK7.\n`

  await components.fs.writeFile(cursorRulesPath, content)
  components.logger.log('✓ Generated .cursorrules')
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
  await options.components.fs.mkdir(contextDir, { recursive: true })

  const filesToDownload = await getAllFiles(options.components, GITHUB_API_BASE)
  const successfulDownloads: string[] = []
  const failedDownloads: Array<{ filePath: string; error: string }> = []

  const downloadPromises = filesToDownload.map(async ({ url, relativePath }) => {
    try {
      const content = await downloadFile(options.components, url)
      const localFilePath = path.join(contextDir, relativePath)
      // Ensure the parent directory exists for nested files
      const parentDir = path.dirname(localFilePath)
      await options.components.fs.mkdir(parentDir, { recursive: true })
      await options.components.fs.writeFile(localFilePath, content)
      options.components.logger.log(`✓ Saved ${relativePath}`)
      successfulDownloads.push(relativePath)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      options.components.logger.log(`✗ Failed to download ${relativePath}: ${errorMessage}`)
      failedDownloads.push({ filePath: relativePath, error: errorMessage })
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

  // Step 2: Generate CLAUDE.md (only if absent)
  try {
    const skills = await discoverSkills(options.components, contextDir)
    await generateClaudeMd(options.components, targetDir, skills)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    options.components.logger.log(`[AI-Context] Failed to generate CLAUDE.md: ${errorMessage}`)
  }

  // Step 3: Generate .cursorrules (only if absent)
  try {
    const skills = await discoverSkills(options.components, contextDir)
    await generateCursorRules(options.components, targetDir, skills)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    options.components.logger.log(`[AI-Context] Failed to generate .cursorrules: ${errorMessage}`)
  }

  // Step 4: Update .dclignore
  try {
    await ensureDclIgnoreEntries(options.components, targetDir, ['CLAUDE.md', '.cursorrules'])
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    options.components.logger.log(`[AI-Context] Failed to update .dclignore: ${errorMessage}`)
  }
}
