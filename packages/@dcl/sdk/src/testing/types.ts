import type { TransformType } from '@dcl/ecs'
import type { logTestResult, plan, setCameraTransform } from '~system/Testing'

export type TestHelpers = {
  /**
   * Instructs the renderer to set the camera transform to the provided argument.
   * This function resolves the next frame and fails if the CameraTransform is not
   * equal to the provided argument.
   */
  setCameraTransform(transform: Pick<TransformType, 'position' | 'rotation'>): Promise<void>
}

export type TestFunction = (helpers: TestHelpers) => Generator | Promise<any>

export type TestDefinitionFunction = (name: string, fn: TestFunction) => void

export type TestingModule = {
  logTestResult: typeof logTestResult
  plan: typeof plan
  setCameraTransform: typeof setCameraTransform
}
