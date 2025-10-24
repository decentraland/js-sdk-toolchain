import path from 'path'
import prompts from 'prompts'
import { Result } from 'arg'
import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { getValidWorkspace } from '../../logic/workspace-validations'
import { SceneProject } from '../../logic/project-validations'
import {
  printCurrentProjectStarting,
  printProgressInfo,
  printProgressStep,
  printSuccess,
  printWarning
} from '../../logic/beautiful-logs'
import { executeSceneCode } from './scene-executor'
import { generateCompositeFiles } from './composite-generator'
import { commentSourceFiles } from './code-commenter'
import { migrateAssets } from './asset-migrator'
import { generateEntityNames } from './name-generator'

interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'fs' | 'logger' | 'analytics' | 'spawner'>
}

export const args = declareArgs({
  '--dir': String,
  '--help': Boolean,
  '-h': '--help',
  '--yes': Boolean,
  '-y': '--yes',
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
    -y, --yes                 Skip the confirmation prompt

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

  const shouldContinue = options.args['--yes'] ? true : await promptForDestructiveAction(options.components)
  if (!shouldContinue) return

  const MAX_STEPS = 5

  for (const project of workspace.projects) {
    printCurrentProjectStarting(options.components.logger, project, workspace)

    if (project.kind === 'scene') {
      await exportSceneToCrdt(options, project, MAX_STEPS)
    } else {
      options.components.logger.warn(`Project ${project.workingDirectory} is not a scene, skipping...`)
    }
  }
}

async function promptForDestructiveAction(components: Pick<CliComponents, 'logger'>): Promise<boolean> {
  const { logger } = components
  printWarning(
    logger,
    'This command will modify your scene code by commenting it out and creating composite/CRDT files.'
  )
  logger.log('  - Your original code will be backed up with a .backup.ts extension')
  logger.log('  - The scene will be converted to Creator Hub format')
  logger.log('  - Files will be moved around')
  logger.log('  - If you are not using any version control system, undoing this operation will be REALLY cumbersome')
  logger.log('')

  let cancelled = false
  const onCancel = () => {
    cancelled = true
  }

  const { confirmed } = await prompts(
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Do you want to continue?',
      initial: false
    },
    { onCancel }
  )

  if (cancelled || !confirmed) {
    logger.log('Operation cancelled by user.')
    return false
  }

  return true
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
  const { engine, sceneCodeEntrypoint } = await executeSceneCode(options.components, project, crdtFilePath)
  printProgressInfo(logger, `Engine state captured successfully`)

  // Step 2: migrate assets (before generating composite/crdt)
  printProgressStep(logger, 'Organizing assets for Creator Hub', currentStep++, maxSteps)
  const updatedCount = await migrateAssets(options.components, project, engine)
  printProgressInfo(logger, `Migrated ${updatedCount} asset file(s) successfully`)

  // Step 3: generate entity names
  printProgressStep(logger, 'Generating names for entities', currentStep++, maxSteps)
  const namedEntitiesCount = await generateEntityNames(options.components, engine)
  printProgressInfo(logger, `Generated names for ${namedEntitiesCount} entity/entities`)

  // Step 4: generate composite and crdt files (with updated asset paths and names)
  printProgressStep(logger, 'Generating composite and crdt files', currentStep++, maxSteps)
  await generateCompositeFiles(options.components, engine, compositeFilePath, crdtFilePath, entityNamesFilePath)
  printProgressInfo(logger, `Generated main.composite ✅ (${compositeFilePath})`)
  printProgressInfo(logger, `Generated main.crdt ✅ (${crdtFilePath})`)
  printProgressInfo(logger, `Generated entity-names.ts ✅ (${entityNamesFilePath})`)

  // Step 5: comment out original code
  printProgressStep(logger, 'Commenting out original code', currentStep++, maxSteps)
  const bundleEntrypoint = path.join(project.workingDirectory, project.scene.main)
  await commentSourceFiles(options.components, sceneCodeEntrypoint, bundleEntrypoint)
  const relativeEntrypoint = path.relative(project.workingDirectory, sceneCodeEntrypoint)
  printProgressInfo(logger, `Commented out bundle entrypoint ${project.scene.main} and added stub main() function`)
  printProgressInfo(logger, `Commented out scene code entrypoint ${relativeEntrypoint}`)

  printSuccess(
    logger,
    'Scene successfully migrated to Creator Hub format!',
    `\nNext steps:
  - Open your scene in the Creator Hub to edit visually
  - Uncomment parts of the code in src/ for hybrid workflows
  - Use "src/entity-names.ts" to reference entities by name in code`
  )
}
