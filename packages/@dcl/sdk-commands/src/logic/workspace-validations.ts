import path, { resolve } from 'path'
import { generateLazyValidator, JSONSchema, ValidateFunction } from '@dcl/schemas'
import { CliError } from './error'
import { CliComponents } from '../components'
import { assertValidProjectFolder } from './project-validations'

export type Workspace = {
  folders: Array<{ path: string }>
}

export namespace Workspace {
  export const schema: JSONSchema<Workspace> = {
    type: 'object',
    properties: {
      folders: {
        type: 'array',
        additionalProperties: true,
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            path: {
              type: 'string'
            }
          },
          required: ['path'],
          additionalProperties: true
        }
      }
    },
    required: ['folders']
  }
  export const validate: ValidateFunction<Workspace> = generateLazyValidator(schema)
}

// this is "overridable" by env var to test integrations like ".code-workspace" instead
const WORKSPACE_FILE = process.env.WORKSPACE_FILE || 'dcl-workspace.json'

/**
 * Composes the path to the `dcl-workspace.json` file based on the provided path.
 * @param projectRoot The path to the directory containing the file.
 */
export function getWorkspaceFilePath(projectRoot: string): string {
  return resolve(projectRoot, WORKSPACE_FILE)
}

export function assertValidWorkspace(workspace: Workspace) {
  if (!Workspace.validate(workspace)) {
    const errors: string[] = []
    if (Workspace.validate.errors) {
      for (const error of Workspace.validate.errors) {
        errors.push(`Error validating ${WORKSPACE_FILE}: ${error.message}`)
      }
    }
    throw new CliError(`Invalid ${WORKSPACE_FILE} file:\n${errors.join('\n')}`)
  }
}

/**
 * Get valid workspace to work on
 */
export async function getValidWorkspace(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectRoot: string
): Promise<Workspace> {
  try {
    const workspaceJsonRaw = await components.fs.readFile(getWorkspaceFilePath(projectRoot), 'utf8')
    const workspaceJson = JSON.parse(workspaceJsonRaw) as Workspace

    // assert valid data structure
    assertValidWorkspace(workspaceJson)

    // validate all folders are valid projects
    for (const folder of workspaceJson.folders) {
      const result = await assertValidProjectFolder(components, path.join(projectRoot, folder.path))

      if (result.workspace)
        throw new CliError(`It is not allowed to have nested workspaces. Root=${projectRoot}, Child=${folder.path}`)
    }

    return workspaceJson
  } catch (err: any) {
    throw new CliError(`Error reading the ${getWorkspaceFilePath(projectRoot)} file: ${err.message}`)
  }
}
