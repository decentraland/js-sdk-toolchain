import { defineLibraryComponents } from './generated/index.gen'

export enum COMPONENT_ID {
  SYNC = 1000
}

/**
 * @public
 */
export type SdkComponents = ReturnType<typeof defineLibraryComponents>
