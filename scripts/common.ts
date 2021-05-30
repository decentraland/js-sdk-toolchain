import { resolve } from 'path'
import { ensureFileExists, executeStep, installDependencyWithVersion, patchJson, readJson, rmFolder } from './helpers'

export const flow = describe

// TOOLS
export const TSC = resolve('node_modules/.bin/tsc')
export const TERSER = resolve('packages/@dcl/dcl-rollup/node_modules/.bin/terser')
export const ROLLUP = resolve('packages/@dcl/dcl-rollup/node_modules/.bin/rollup')

// WORKING DIRECTORIES
export const BUILD_ECS_PATH = resolve('packages/@dcl/build-ecs')
export const DECENTRALAND_AMD_PATH = resolve('packages/@dcl/amd')
export const ROLLUP_CONFIG_PATH = resolve('packages/@dcl/dcl-rollup')
export const ECS_PATH = resolve('packages/decentraland-ecs')

export function commonChecks() {
  test('@dcl/posix is consistent across projects', () => {
    const ecsVersion = readJson('package.json', ECS_PATH).dependencies['@dcl/posix']
    const amdVersion = readJson('package.json', DECENTRALAND_AMD_PATH).devDependencies['@dcl/posix']

    expect(amdVersion).toEqual(ecsVersion)
  })

  test('@dcl/posix snapshot are not used for releases', () => {
    // we only validate ECS version, previous step validates consistenty
    const dclPosixVersion: string = readJson('package.json', ECS_PATH).dependencies['@dcl/posix'] || ''

    const ref: string = (process.env.GITHUB_REF || '').split(/\//g).pop()!

    const snapshotExpr = /-/ // if it contains a dash, it is a snapshot

    // in releases, we fail right here
    if (/^\d+\.\d+\.\d+.*/.test(ref)) {
      expect(dclPosixVersion).not.toMatch(snapshotExpr)
    }

    if (snapshotExpr.test(dclPosixVersion)) {
      console.error(
        `::error file=${resolve(
          ECS_PATH,
          'package.json'
        )},line=0,col=0::Using a snapshot version of @dcl/posix if you create a release with the snapshot it will fail`
      )
    }
  })
}
