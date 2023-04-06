import path, { resolve } from 'path'
import { generateLazyValidator, JSONSchema, ValidateFunction } from '@dcl/schemas'
import { CliError } from './error'
import { CliComponents } from '../components'
import { assertValidProjectFolder, ProjectUnion } from './project-validations'

export type WorkspaceJson = {
  folders: Array<{ path: string }>
}

export namespace WorkspaceJson {
  export const schema: JSONSchema<WorkspaceJson> = {
    type: 'object',
    additionalProperties: true,
    properties: {
      folders: {
        type: 'array',
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
  export const validate: ValidateFunction<WorkspaceJson> = generateLazyValidator(schema)
}

export type Workspace = {
  rootWorkingDirectory: string
  projects: Array<ProjectUnion>
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

/* istanbul ignore next */
export function assertValidWorkspace(workspace: WorkspaceJson) {
  if (!WorkspaceJson.validate(workspace)) {
    const errors: string[] = []
    if (WorkspaceJson.validate.errors) {
      for (const error of WorkspaceJson.validate.errors) {
        errors.push(`Error validating ${WORKSPACE_FILE}: ${error.message}`)
      }
    }
    /* istanbul ignore next */
    throw new CliError(`Invalid ${WORKSPACE_FILE} file:\n${errors.join('\n')}`)
  }
}

// This function takes a list of folders and returns a workspace containing the projects in the folders.
// The working directory of each project is the absolute path of the folder.
// The root working directory of the workspace is the absolute path of the working directory.
export async function workspaceFromFolders(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  workingDirectory: string,
  folders: string[]
): Promise<Workspace> {
  const ret: Workspace = {
    rootWorkingDirectory: workingDirectory,
    projects: []
  }

  for (const folder of folders) {
    const wd = path.resolve(workingDirectory, folder)
    const project = await assertValidProjectFolder(components, wd)
    ret.projects.push(project)
  }

  return ret
}

/**
 * Returns a workspace by loading the workspace file or generating a single-folder workspace on the fly.
 */
export async function getValidWorkspace(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectRoot: string
): Promise<Workspace> {
  const workingDirectory = path.resolve(projectRoot)
  const workspaceFile = getWorkspaceFilePath(workingDirectory)

  if (await components.fs.fileExists(workspaceFile)) {
    // either we load a workspace
    try {
      const workspaceJsonRaw = await components.fs.readFile(workspaceFile, 'utf8')
      const workspaceJson = JSON.parse(workspaceJsonRaw) as WorkspaceJson

      // assert valid data structure
      assertValidWorkspace(workspaceJson)

      return await workspaceFromFolders(
        components,
        workingDirectory,
        workspaceJson.folders.map((f) => f.path)
      )
    } catch (err: any) {
      /* istanbul ignore next */
      throw new CliError(`Error reading the ${getWorkspaceFilePath(workingDirectory)} file: ${err.message}`)
    }
  } else {
    // or generate a single-folder workspace on the fly
    return await workspaceFromFolders(components, workingDirectory, ['.'])
  }
}
