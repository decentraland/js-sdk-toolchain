import { ILoggerComponent } from '@well-known-components/interfaces'
import { colors } from '../components/log'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { name, version } = require('../../package.json')

export function printProgressStep(logger: ILoggerComponent.ILogger, log: string, currentStep: number, maxStep: number) {
  logger.log(colors.dim(`[${currentStep}/${maxStep}]`) + ' ' + log)
}

export function printProgressInfo(logger: ILoggerComponent.ILogger, log: string) {
  logger.log(colors.dim(log))
}

export function printCommand(logger: ILoggerComponent.ILogger, commandName: string) {
  logger.log(colors.bold(`${name} ${commandName} v${version}`))
}

export function printSuccess(logger: ILoggerComponent.ILogger, operationSuccessfulMessage: string, summary: string) {
  // print a space before the success callout
  logger.log('')
  logger.log(colors.greenBright(operationSuccessfulMessage))
  if (typeof summary === 'string') {
    logger.log(summary)
  }
}
