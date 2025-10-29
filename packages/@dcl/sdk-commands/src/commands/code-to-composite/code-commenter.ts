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
  // use line-by-line commenting to avoid issues with existing /* */ comments
  const commentedLines = content.split('\n').map(line => `// ${line}`).join('\n')

  return `// ============================================================================
// ${COMMENT_MARKER}
//
// This code has been migrated to main.composite and main.crdt files.
// The scene can now be edited visually using the Creator Hub app.
//
// To restore code-based workflow: Uncomment the code below
// For hybrid workflow: Uncomment specific parts you want to keep dynamic
//
// Learn more: https://docs.decentraland.org/creator
// ============================================================================
//
${commentedLines}`
}

/**
 * Replaces the entrypoint file with a stub main() function
 */
export async function commentEntrypoint({ fs }: Pick<CliComponents, 'fs'>, entrypointPath: string): Promise<void> {
  const stubContent = `// ${COMMENT_MARKER}
// Scene content is managed by Creator Hub (main.composite)

export function main() {
  // Add dynamic code, systems, or event handlers here
}
`

  await fs.writeFile(entrypointPath, stubContent)
}

/**
 * Comments out a single source file
 */
async function commentSourceFile({ fs }: Pick<CliComponents, 'fs'>, filePath: string): Promise<void> {
  const currentContent = await fs.readFile(filePath, 'utf-8')

  if (isAlreadyCommented(currentContent)) {
    return
  }

  const commentedContent = generateCommentHeader(currentContent) + '\n'

  await fs.writeFile(filePath, commentedContent)
}

function getBackupPath(filePath: string): string {
  const parsedPath = path.parse(filePath)
  return path.join(parsedPath.dir, `${parsedPath.name}.backup${parsedPath.ext}`)
}

/**
 * Comments out the entrypoint and all source files in the src directory
 *
 * NOTE: Need to comment out all the src files otherwise typechecker will fail preventing deploys, etc.
 */
export async function commentSourceFiles(
  components: Pick<CliComponents, 'fs'>,
  sceneCodeEntrypoint: string,
  bundleEntrypoint: string
): Promise<number> {
  const normalizedBundleEntrypoint = path.normalize(bundleEntrypoint)
  const normalizedSceneCodeEntrypoint = path.normalize(sceneCodeEntrypoint)
  const srcDir = path.dirname(normalizedSceneCodeEntrypoint)

  const sourceFiles = globSync('**/*.{ts,tsx,js,jsx}', {
    cwd: srcDir,
    absolute: true,
    ignore: ['**/*.d.ts', '**/node_modules/**']
  })

  const filesToComment = sourceFiles.filter(file => {
    const normalized = path.normalize(file)
    return normalized !== normalizedBundleEntrypoint &&
           normalized !== normalizedSceneCodeEntrypoint
  })

  await Promise.all([
    commentEntrypoint(components, normalizedBundleEntrypoint),
    components.fs.copyFile(normalizedSceneCodeEntrypoint, getBackupPath(sceneCodeEntrypoint)),
    commentSourceFile(components, normalizedSceneCodeEntrypoint),
    ...filesToComment.map(file => commentSourceFile(components, file))
  ])

  return filesToComment.length
}
