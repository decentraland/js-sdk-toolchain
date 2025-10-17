import path from 'path'
import { globSync } from 'glob'
import { CliComponents } from '../../components'

const COMMENT_MARKER = 'COMMENTED BY "@dcl/sdk-commands code-to-composite" COMMAND'

/**
 * Checks if a file has already been commented by this command
 */
function isAlreadyCommented(content: string): boolean {
  return content.includes(COMMENT_MARKER)
}

/**
 * Generates the comment header for migrated files
 */
function generateCommentHeader(content: string): string {
  return `/* ============================================================================
 * ${COMMENT_MARKER}
 *
 * This code has been migrated to main.composite and main.crdt files.
 * The scene can now be edited visually using the Creator Hub app.
 *
 * To restore code-based workflow: Uncomment the code below
 * For hybrid workflow: Uncomment specific parts you want to keep dynamic
 *
 * Learn more: https://docs.decentraland.org/creator
 * ============================================================================
 *
${content}
 *
 */`
}

/**
 * Comments out the entire entrypoint file and adds a stub main() function
 */
export async function commentEntrypoint({ fs }: Pick<CliComponents, 'fs'>, entrypointPath: string): Promise<void> {
  const currentContent = await fs.readFile(entrypointPath, 'utf-8')

  // Skip if already commented
  if (isAlreadyCommented(currentContent)) {
    return
  }

  const commentedContent = `${generateCommentHeader(currentContent)}

// Basic stub for scene entrypoint
import { engine } from '@dcl/sdk/ecs'

export function main() {
  // Scene content is managed by Creator Hub (main.composite)
  // Add dynamic code, systems, or event handlers here
}
`

  await fs.writeFile(entrypointPath, commentedContent)
}

/**
 * Comments out a single source file
 */
async function commentSourceFile({ fs }: Pick<CliComponents, 'fs'>, filePath: string): Promise<void> {
  const currentContent = await fs.readFile(filePath, 'utf-8')

  // Skip if already commented
  if (isAlreadyCommented(currentContent)) {
    return
  }

  const commentedContent = generateCommentHeader(currentContent) + '\n'

  await fs.writeFile(filePath, commentedContent)
}

/**
 * Comments out all TypeScript and JavaScript files in the src directory including the entrypoint
 */
export async function commentSourceFiles(
  components: Pick<CliComponents, 'fs'>,
  workingDirectory: string,
  entrypointPath: string
): Promise<string[]> {
  const { fs } = components
  const normalizedEntrypoint = path.normalize(entrypointPath)
  await commentEntrypoint(components, normalizedEntrypoint)

  const srcDir = path.join(workingDirectory, 'src')

  if (!(await fs.directoryExists(srcDir))) {
    return []
  }

  const sourceFiles = globSync('**/*.{ts,js}', {
    cwd: srcDir,
    absolute: true,
    ignore: ['**/*.d.ts', '**/node_modules/**']
  })

  const commentedFiles: string[] = []

  for (const filePath of sourceFiles) {
    const normalizedFilePath = path.normalize(filePath)

    if (normalizedFilePath === normalizedEntrypoint) {
      continue
    }

    await commentSourceFile(components, normalizedFilePath)
    commentedFiles.push(normalizedFilePath)
  }

  return commentedFiles
}
