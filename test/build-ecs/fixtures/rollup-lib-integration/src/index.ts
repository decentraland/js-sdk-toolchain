import { getUserData } from '~system/UserIdentity'

export { aaa } from './folder/test3'
export { test2 } from './test2'
/**
 * @public
 */
export function test(): any {
  return getUserData({})
}
