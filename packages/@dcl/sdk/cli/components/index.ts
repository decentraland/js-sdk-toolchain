import { createFetchComponent, IFetchComponent } from './fetch'
import { createFsComponent, IFileSystemComponent } from './fs'

export type CliComponents = {
  fs: IFileSystemComponent
  fetch: IFetchComponent
}

export function initComponents(): CliComponents {
  return {
    fs: createFsComponent(),
    fetch: createFetchComponent()
  }
}
