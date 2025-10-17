import path from 'path'
import i18next from 'i18next'
import { Result } from 'arg'
import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { CliError } from '../../logic/error'
import { getValidWorkspace } from '../../logic/workspace-validations'
import { SceneProject } from '../../logic/project-validations'
import {
  printCurrentProjectStarting,
  printProgressInfo,
  printProgressStep,
  printSuccess
} from '../../logic/beautiful-logs'
import { executeSceneCode } from './scene-executor'
import { generateCompositeFiles } from './composite-generator'
import { commentSourceFiles } from './code-commenter'

interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'fs' | 'logger' | 'analytics' | 'spawner'>
}

export const args = declareArgs({
  '--dir': String,
  '--help': Boolean,
  '-h': '--help',
  '--force': Boolean,
  '-f': '--force'
})

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands code-to-composite [options]'

  Description:

    Migrates a code-only scene to Creator Hub-compatible format by generating
    composite/crdt files and commenting out the original code.

  Options:

    -h, --help                Displays complete help
    --dir                     Path to directory to export
    -f, --force               Overwrite existing composite/crdt files

  Example:

    - Export a code-only scene to Creator Hub format:
      '$ sdk-commands code-to-composite'

    - Export a specific directory:
      '$ sdk-commands code-to-composite --dir ./my-scene'
  `)
}

export async function main(options: Options) {
  const workingDirectory = path.resolve(process.cwd(), options.args['--dir'] || '.')
  const workspace = await getValidWorkspace(options.components, workingDirectory)

  const MAX_STEPS = 3

  for (const project of workspace.projects) {
    printCurrentProjectStarting(options.components.logger, project, workspace)

    if (project.kind === 'scene') {
      await exportSceneToCrdt(options, project, MAX_STEPS)
    } else {
      options.components.logger.warn(`Project ${project.workingDirectory} is not a scene, skipping...`)
    }
  }
}

async function exportSceneToCrdt(options: Options, project: SceneProject, maxSteps: number) {
  const { fs, logger } = options.components
  let currentStep = 1

  const compositeFilePath = path.join(project.workingDirectory, 'assets', 'scene', 'main.composite')
  const crdtFilePath = path.join(project.workingDirectory, 'main.crdt')
  const entityNamesFilePath = path.join(project.workingDirectory, 'src', 'entity-names.ts')
  const hasComposite = await fs.fileExists(compositeFilePath)
  const hasCrdt = await fs.fileExists(crdtFilePath)

  if (hasComposite || hasCrdt) {
    if (!options.args['--force']) {
      const foundFiles = [hasComposite ? 'main.composite' : '', hasCrdt ? 'main.crdt' : ''].filter(Boolean).join(', ')
      throw new CliError(
        'CODE_TO_COMPOSITE_FILES_EXIST',
        i18next.t('errors.code_to_composite.files_exist') + '\n' + `  Found: ${foundFiles}`
      )
    }

    if (hasComposite) {
      await fs.rm(compositeFilePath)
      logger.log(`Removed existing main.composite file`)
    }
    if (hasCrdt) {
      await fs.rm(crdtFilePath)
      logger.log(`Removed existing main.crdt file`)
    }
  }

  // Step 1: execute scene code to populate engine
  printProgressStep(logger, 'Executing scene code to capture state', currentStep++, maxSteps)
  const engine = await executeSceneCode(options.components, project)
  printProgressInfo(logger, `Engine state captured successfully`)

  // Step 2: generate composite and crdt files
  printProgressStep(logger, 'Generating composite and crdt files', currentStep++, maxSteps)
  await generateCompositeFiles(options.components, engine, compositeFilePath, crdtFilePath, entityNamesFilePath)
  printProgressInfo(logger, `Generated main.composite ✅ (${compositeFilePath})`)
  printProgressInfo(logger, `Generated main.crdt ✅ (${crdtFilePath})`)
  printProgressInfo(logger, `Generated entity-names.ts ✅ (${entityNamesFilePath})`)

  // Step 3: comment out original code
  printProgressStep(logger, 'Commenting out original code', currentStep++, maxSteps)
  const entrypoint = path.join(project.workingDirectory, project.scene.main)
  const commentedFiles = await commentSourceFiles(options.components, project.workingDirectory, entrypoint)
  printProgressInfo(logger, `Commented out ${project.scene.main}`)
  printProgressInfo(logger, `Added stub main() function`)
  if (commentedFiles.length > 0) {
    printProgressInfo(logger, `Commented out ${commentedFiles.length} additional source file(s)`)
  }

  printSuccess(
    logger,
    'Scene successfully migrated to Creator Hub format!',
    `\nNext steps:
  - Open your scene in the Creator Hub to edit visually
  - Uncomment parts of the code in src/ for hybrid workflows
  - Use "src/entity-names.ts" to reference entities by name in code`
  )
}
