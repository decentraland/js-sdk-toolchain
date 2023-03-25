import { ILoggerComponent, IConfigComponent } from '@well-known-components/interfaces'
import { spawn } from 'child_process'
import { createProcessSpawnerComponent, IProcessSpawnerComponent } from '../logic/exec'
import { createAnalyticsComponent, IAnalyticsComponent } from './analytics'
import { createConfigComponent } from './config'
import { createFetchComponent, IFetchComponent } from './fetch'
import { createFsComponent, IFileSystemComponent } from './fs'
import { createStderrCliLogger } from './log'

export type CliComponents = {
  fs: IFileSystemComponent
  fetch: IFetchComponent
  logger: ILoggerComponent.ILogger
  analytics: IAnalyticsComponent
  spawner: IProcessSpawnerComponent
  config: IConfigComponent
}

export async function initComponents(): Promise<CliComponents> {
  const fs = createFsComponent()
  const config = await createConfigComponent({ fs })
  const logger = createStderrCliLogger()
  const spawner = createProcessSpawnerComponent(spawn)

  return {
    fs,
    fetch: createFetchComponent(),
    logger,
    config,
    spawner,
    analytics: await createAnalyticsComponent({ config, logger, fs })
  }
}
