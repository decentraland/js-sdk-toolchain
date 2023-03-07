import { ILoggerComponent } from '@well-known-components/interfaces'
import { createAnalyticsComponent, IAnalyticsComponent } from './analytics'
import { createDCLInfoConfigComponent, IDCLInfoConfigComponent } from './dcl-info-config'
import { createFetchComponent, IFetchComponent } from './fetch'
import { createFsComponent, IFileSystemComponent } from './fs'
import { createStdoutCliLogger } from './log'

export type CliComponents = {
  fs: IFileSystemComponent
  fetch: IFetchComponent
  logger: ILoggerComponent.ILogger
  dclInfoConfig: IDCLInfoConfigComponent
  analytics: IAnalyticsComponent
}

export async function initComponents(): Promise<CliComponents> {
  const fsComponent = createFsComponent()
  const dclInfoConfig = await createDCLInfoConfigComponent({ fs: fsComponent })
  return {
    fs: fsComponent,
    fetch: createFetchComponent(),
    logger: createStdoutCliLogger(),
    dclInfoConfig,
    analytics: await createAnalyticsComponent({ dclInfoConfig })
  }
}
