import { ILoggerComponent } from '@well-known-components/interfaces'
import path from 'path'
import { colors } from '../components/log'
import { ProjectUnion } from './project-validations'
import { Workspace } from './workspace-validations'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { name, version } = require('../../package.json')

export function printProgressStep(logger: ILoggerComponent.ILogger, log: string, currentStep: number, maxStep: number) {
  logger.log(colors.dim(`[${currentStep}/${maxStep}]`) + ' ' + log)
}

export function printProgressInfo(logger: ILoggerComponent.ILogger, log: string) {
  logger.log(colors.dim(log))
}

export function printStep(logger: ILoggerComponent.ILogger, log: string) {
  logger.log(log)
}

/**
 * If there are more than one project, we print the current project as "progress info"
 */
export function printCurrentProjectStarting(
  logger: ILoggerComponent.ILogger,
  project: ProjectUnion,
  workspace: Workspace
) {
  if (workspace.projects.length > 1) {
    const relativePath = path.relative(workspace.rootWorkingDirectory, project.workingDirectory)
    const progress = colors.dim(`[${workspace.projects.indexOf(project) + 1}/${workspace.projects.length}]`)
    logger.log(colors.cyan(`\n${progress} in ${relativePath}:`))
  }
}

export function printCommand(logger: ILoggerComponent.ILogger, commandName: string) {
  logger.log(colors.bold(`${name} ${commandName} v${version}`))
}

export function printWarning(logger: ILoggerComponent.ILogger, warning: string) {
  logger.log(colors.bgBlack(colors.yellow(colors.bold(`⚠️ WARNING!`) + ' ' + warning)))
}

export function printSuccess(logger: ILoggerComponent.ILogger, operationSuccessfulMessage: string, summary: string) {
  // print a space before the success callout
  logger.log('')
  logger.log(colors.greenBright(operationSuccessfulMessage))
  if (typeof summary === 'string') {
    logger.log(summary)
  }
}

export function printError(logger: ILoggerComponent.ILogger, comment: string, error: Error) {
  logger.log(colors.redBright(comment))
  logger.error(error)
}
