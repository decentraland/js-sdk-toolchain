import { ILoggerComponent } from '@well-known-components/interfaces'
import { spawn } from 'child_process'
import { createProcessSpawnerComponent, IProcessSpawnerComponent } from '../logic/exec'
import { createAnalyticsComponent, IAnalyticsComponent } from './analytics'
import { createDCLInfoConfigComponent, IDCLInfoConfigComponent } from './dcl-info-config'
import { createFetchComponent, IFetchComponent } from './fetch'
import { createFsComponent, IFileSystemComponent } from './fs'
import { createStderrCliLogger } from './log'

export type CliComponents = {
  fs: IFileSystemComponent
  fetch: IFetchComponent
  logger: ILoggerComponent.ILogger
  dclInfoConfig: IDCLInfoConfigComponent
  analytics: IAnalyticsComponent
  spawner: IProcessSpawnerComponent
}

export async function initComponents(): Promise<CliComponents> {
  const fsComponent = createFsComponent()
  const dclInfoConfig = await createDCLInfoConfigComponent({ fs: fsComponent })
  const logger = createStderrCliLogger()
  const spawner = createProcessSpawnerComponent(spawn)

  return {
    fs: fsComponent,
    fetch: createFetchComponent(),
    logger,
    dclInfoConfig,
    spawner,
    analytics: await createAnalyticsComponent({ dclInfoConfig, logger })
  }
}
