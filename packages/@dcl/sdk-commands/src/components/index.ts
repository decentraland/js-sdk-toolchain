import { ILoggerComponent } from '@well-known-components/interfaces'
import { createFetchComponent, IFetchComponent } from './fetch'
import { createFsComponent, IFileSystemComponent } from './fs'
import { createStdoutCliLogger } from './log'

export type CliComponents = {
  fs: IFileSystemComponent
  fetch: IFetchComponent
  logger: ILoggerComponent.ILogger
}

export function initComponents(): CliComponents {
  return {
    fs: createFsComponent(),
    fetch: createFetchComponent(),
    logger: createStdoutCliLogger()
  }
}
